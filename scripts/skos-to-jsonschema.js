/**
 * skos-to-jsonschema.js
 *
 * Convertit un thésaurus SKOS exporté en JSON-LD (un seul skos:ConceptScheme,
 * avec ses skos:Concept) en :
 *   1. un JSON Schema dont l'`enum` liste les prefLabel des concepts
 *   2. un contexte JSON-LD associant chaque label à l'URI complète du concept
 *
 * Usage :
 *   node skos-to-jsonschema.js <entree.jsonld> [dossier-sortie]
 */

const fs = require("fs");
const path = require("path");

// ---------- Utilitaires ----------

/** Extrait une chaîne lisible d'une valeur qui peut être une string,
 *  un objet {lang, value}, ou un tableau de ces deux formes (on privilégie 'en'). */
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
/** Nom de fichier "safe" dérivé du dernier segment de l'URI du concept scheme. */
function slugFromUri(uri) {
  const last = uri.replace(/\/+$/, "").split("/").pop() ?? "thesaurus";
  return last.replace(/[^a-zA-Z0-9_-]/g, "-");
}

// ---------- Core of the conversion ----------

function convert(doc) {
  const nodes = doc.graph;

  const scheme = nodes.find((n) => hasType(n, "skos:ConceptScheme"));
  if (!scheme) {
    throw new Error("NO skos:ConceptSchemefound in the JSON-LD graph.");
  }

  const schemeTitle = extractLabel(scheme["dct:title"]) ?? slugFromUri(scheme.uri);

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

// ---------- Génération des artefacts ----------

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

// ---------- Point d'entrée CLI ----------

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
  const slug = slugFromUri(result.schemeUri);
  const schemaFilename = `${slug}.json`;

  const schema = buildJsonSchema(result, schemaFilename);

  fs.mkdirSync(outputDir, { recursive: true });

  const schemaPath = path.join(outputDir, schemaFilename);
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + "\n", "utf-8");

  console.log(`Concepts trouvés : ${result.concepts.map((c) => c.label).join(", ")}`);
  console.log(`JSON Schema écrit : ${schemaPath}`);
}

main();
