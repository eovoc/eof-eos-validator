/**
 * rdf-to-jsonschema.js
 *
 * Converts a SKOS thesaurus exported as RDF/XML (one or more skos:ConceptScheme,
 * each with its own skos:Concept top concepts) into one JSON Schema per
 * concept scheme, whose `enum` lists the prefLabels of that scheme's top
 * concepts (skos:hasTopConcept).
 *
 * Usage:
 *   node rdf-to-jsonschema.js <input.rdf> [output-dir]
 */

const fs = require("fs");
const path = require("path");

const SKOS_CONCEPT_SCHEME = "http://www.w3.org/2004/02/skos/core#ConceptScheme";

// ---------- XML parsing ----------
// The RDF/XML export is flat: every subject is one or more <rdf:Description
// rdf:about="URI"> blocks, each holding non-nested child elements that are
// either resource references (rdf:resource="...") or plain-text literals
// (optionally xml:lang-tagged). A subject's properties are commonly split
// across several blocks, so blocks sharing the same rdf:about are merged.

const XML_ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function decodeEntities(text) {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ref) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return XML_ENTITIES[ref] ?? match;
  });
}

function parseAttrs(attrString) {
  const attrs = {};
  const attrPattern = /([\w:-]+)="([^"]*)"/g;
  let match;
  while ((match = attrPattern.exec(attrString)) !== null) {
    attrs[match[1]] = decodeEntities(match[2]);
  }
  return attrs;
}

/** Parses the immediate (non-nested) children of a <rdf:Description> block into
 *  a list of { predicate, resource? , value?, lang? }. */
function parseChildren(blockContent) {
  const childPattern = /<([\w]+:[\w-]+)((?:\s+[\w:-]+="[^"]*")*)\s*(?:\/>|>([\s\S]*?)<\/\1>)/g;
  const children = [];
  let match;
  while ((match = childPattern.exec(blockContent)) !== null) {
    const [, predicate, attrString, text] = match;
    const attrs = parseAttrs(attrString);
    if (attrs["rdf:resource"] !== undefined) {
      children.push({ predicate, resource: attrs["rdf:resource"] });
    } else {
      children.push({ predicate, value: decodeEntities(text ?? "").trim(), lang: attrs["xml:lang"] });
    }
  }
  return children;
}

/** Parses the whole RDF/XML document into a Map<subjectUri, node>, merging every
 *  <rdf:Description> block that shares the same rdf:about into a single node. */
function parseRdfXml(xml) {
  const nodesByUri = new Map();
  const blockPattern = /<rdf:Description\s+([^>]*)>([\s\S]*?)<\/rdf:Description>/g;
  let match;
  while ((match = blockPattern.exec(xml)) !== null) {
    const [, attrString, blockContent] = match;
    const uri = parseAttrs(attrString)["rdf:about"];
    if (!uri) continue;

    let node = nodesByUri.get(uri);
    if (!node) {
      node = { uri, types: new Set(), props: new Map() };
      nodesByUri.set(uri, node);
    }

    for (const child of parseChildren(blockContent)) {
      if (child.predicate === "rdf:type" && child.resource) {
        node.types.add(child.resource);
        continue;
      }
      const values = node.props.get(child.predicate) ?? [];
      values.push(child);
      node.props.set(child.predicate, values);
    }
  }
  return nodesByUri;
}

// ---------- Utilities ----------

function getResources(node, predicate) {
  return (node.props.get(predicate) ?? []).map((v) => v.resource).filter((r) => r !== undefined);
}

/** Picks a readable label from a predicate's literal values (prefers 'en'). */
function getLabel(node, predicate) {
  const literals = (node.props.get(predicate) ?? []).filter((v) => v.value !== undefined);
  const english = literals.find((v) => v.lang === "en" || v.lang === undefined);
  return (english ?? literals[0])?.value;
}

/** Safe filename derived from the last segment of a URI. */
function slugFromUri(uri) {
  const last = uri.replace(/\/+$/, "").split("/").pop() ?? "thesaurus";
  return last.replace(/[^a-zA-Z0-9_-]/g, "-");
}

/** Safe filename derived from free text (e.g. a concept scheme's title). */
function extractName(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------- Core of the conversion ----------

function convertScheme(schemeNode, nodesByUri) {
  const schemeTitle = getLabel(schemeNode, "dct:title") ?? slugFromUri(schemeNode.uri);

  let topConceptUris = getResources(schemeNode, "skos:hasTopConcept");
  if (topConceptUris.length === 0) {
    // Fall back to concepts pointing back at this scheme via skos:topConceptOf,
    // in case the scheme node itself lacks the (redundant) skos:hasTopConcept triples.
    topConceptUris = Array.from(nodesByUri.values())
      .filter((n) => getResources(n, "skos:topConceptOf").includes(schemeNode.uri))
      .map((n) => n.uri);
  }

  const labels = [];
  const seen = new Set();
  for (const topUri of topConceptUris) {
    const node = nodesByUri.get(topUri);
    if (!node) continue;

    const label = getLabel(node, "skos:prefLabel");
    if (!label) {
      throw new Error(`Concept without prefLabel: ${topUri}`);
    }
    if (!seen.has(label)) {
      seen.add(label);
      labels.push(label);
    }
  }

  if (labels.length === 0) {
    throw new Error(`No top concepts found for concept scheme: ${schemeNode.uri}`);
  }

  return { schemeUri: schemeNode.uri, schemeTitle, labels };
}

// ---------- Artifact generation ----------

function buildJsonSchema(result, filename) {
  return {
    $schema: "https://json-schema.org/draft/07/schema",
    $id: filename,
    title: result.schemeTitle,
    description: `Enum generated from thesaurus SKOS '${result.schemeTitle}' (${result.schemeUri}).`,
    type: "string",
    enum: result.labels
  };
}

function writeSchema(result, outputDir) {
  const safeName = extractName(result.schemeTitle);
  const schemaFilename = `${safeName}.json`;
  const schema = buildJsonSchema(result, `eof-eos/${safeName}`);
  const schemaPath = path.join(outputDir, schemaFilename);

  let finalSchema = schema;
  fs.writeFileSync(schemaPath, JSON.stringify(finalSchema, null, 2) + "\n", "utf-8");
  return schemaPath;
}

// ---------- CLI entry point ----------

function main() {
  const [, , inputPath, outputDirArg] = process.argv;

  if (!inputPath) {
    console.error("Usage: rdf-to-jsonschema.js <input.rdf> [output-dir]");
    process.exit(1);
  }

  const outputDir = outputDirArg ?? path.dirname(inputPath);
  const xml = fs.readFileSync(inputPath, "utf-8");
  const nodesByUri = parseRdfXml(xml);

  const schemeNodes = Array.from(nodesByUri.values()).filter((n) => n.types.has(SKOS_CONCEPT_SCHEME));
  if (schemeNodes.length === 0) {
    throw new Error("No skos:ConceptScheme found in the RDF/XML graph.");
  }

  fs.mkdirSync(outputDir, { recursive: true });

  for (const schemeNode of schemeNodes) {
    const result = convertScheme(schemeNode, nodesByUri);
    const schemaPath = writeSchema(result, outputDir);
    console.log(`[${result.schemeTitle}] concepts: ${JSON.stringify(result.labels)}`);
    console.log(`JSON Schema written: ${schemaPath}`);
  }
}

main();
