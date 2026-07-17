/**
 * skos-to-jsonschema.js
 *
 * Converts a SKOS thesaurus exported as JSON-LD (a single skos:ConceptScheme,
 * with its skos:Concept nodes) into:
 *   1. a JSON Schema whose `enum` lists the concepts' prefLabels
 * Usage:
 *   node skos-to-jsonschema.js <input.jsonld> [output-dir]
 */

const fs = require("fs");
const path = require("path");

// ---------- Utilities ----------

/** Extracts a readable string from a value that can be a plain string,
 *  a {lang, value} object, or an array of either form (prefers 'en'). */
function extractLabel(value) {
  if (value === undefined) return undefined;

  const values = Array.isArray(value) ? value : [value];
  const normalized = values.map((v) => (typeof v === "string" ? { value: v } : v));

  const english = normalized.find((v) => v.lang === "en" || v.lang === undefined);
  return (english ?? normalized[0])?.value;
}

function asArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function hasType(node, type) {
  return asArray(node.type).includes(type);
}

function hasNarrowerConcept(node){
  //return true if narrower is defined.
   return node.narrower !== undefined;
}
/** Safe filename derived from the last segment of the concept scheme's URI. */
function slugFromUri(uri) {
  const last = uri.replace(/\/+$/, "").split("/").pop() ?? "thesaurus";
  return last.replace(/[^a-zA-Z0-9_-]/g, "-");
}

/** Safe filename derived from free text (e.g. the concept scheme's label). */
function extractName(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Core of the conversion ----------

function convert(doc) {
  const nodes = doc.graph;

  const scheme = nodes.find((n) => hasType(n, "skos:ConceptScheme"));
  if (!scheme) {
    throw new Error("NO skos:ConceptSchemefound in the JSON-LD graph.");
  }

  const schemeTitle = extractLabel(scheme["dct:title"]) ?? extractLabel(scheme.label) ?? slugFromUri(scheme.uri);

  // all skos:Concept from the graph that do not have narrower concept.
  const conceptNodesByUri = new Map(
    nodes.filter((n) => hasType(n, "skos:Concept") && !hasNarrowerConcept(n)).map((n) => [n.uri, n])
  );

  const orderedUris = Array.from(conceptNodesByUri.keys());

  const concepts = orderedUris
    .map((uri) => conceptNodesByUri.get(uri))
    .filter((n) => n !== undefined)
    .map((n) => {
      const label = extractLabel(n.prefLabel);
      if (!label) {
        throw new Error(`Concept without prefLabel : ${n.uri}`);
      }
      return { label, uri: n.uri };
    });

  if (concepts.length === 0) {
    throw new Error("No skos:Concept found for this concept scheme.");
  }

  return { schemeUri: scheme.uri, schemeTitle, concepts };
}

// ---------- Artifact generation ----------

function buildJsonSchema(result, filename) {
  return {
    $schema: "https://json-schema.org/draft/07/schema",
    $id: filename,
    title: result.schemeTitle,
    description: `Enum generated from thesaurus SKOS '${result.schemeTitle}' (${result.schemeUri}).`,
    type: "string",
    enum: result.concepts.map((c) => c.label)
  };
}

/** Merges the enum of a freshly built schema into an existing schema on disk,
 *  keeping the existing enum values (in order) and appending any new ones. */
function mergeEnums(existingSchema, newSchema) {
  const existingEnum = Array.isArray(existingSchema.enum) ? existingSchema.enum : [];
  const additions = newSchema.enum.filter((label) => !existingEnum.includes(label));
  return { ...existingSchema, enum: [...existingEnum, ...additions] };
}

// ---------- CLI entry point ----------

function main() {
  const [, , inputPath, outputDirArg] = process.argv;

  if (!inputPath) {
    console.error("Usage: skos-to-jsonschema.js <entree.jsonld> [dossier-sortie]");
    process.exit(1);
  }

  const outputDir = outputDirArg ?? path.dirname(inputPath);
  const raw = fs.readFileSync(inputPath, "utf-8");
  const doc = JSON.parse(raw);

  const result = convert(doc);
  const safeName = extractName(result.schemeTitle);
  const schemaFilename = `${safeName}.json`;

  const schema = buildJsonSchema(result, `eof-eos/${safeName}`);

  fs.mkdirSync(outputDir, { recursive: true });

  const schemaPath = path.join(outputDir, schemaFilename);

  let finalSchema = schema;
  if (fs.existsSync(schemaPath)) {
    const existingSchema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
    finalSchema = mergeEnums(existingSchema, schema);
  }

  fs.writeFileSync(schemaPath, JSON.stringify(finalSchema, null, 2) + "\n", "utf-8");

  console.log(`Concepts found : ${result.concepts.map((c) => c.label).join(", ")}`);
  console.log(`JSON Schema written : ${schemaPath}`);
}

main();
