/**
 * skosmos-to-rdf.js
 *
 * Converts a raw Skosmos-style SKOS export (RDF/XML using typed elements
 * like <skos:Concept> and <skos:ConceptScheme>, with hierarchy expressed
 * only via skos:broader/skos:narrower — no skos:hasTopConcept) into the
 * generic <rdf:Description>-based form that rdf-to-jsonschema.js expects:
 * a ConceptScheme with dct:title and explicit skos:hasTopConcept links,
 * and each top concept carrying skos:topConceptOf back to the scheme.
 *
 * A scheme's top concepts are resolved as:
 *   1. its own skos:hasTopConcept, if present (already generic — passed
 *      through as-is), otherwise
 *   2. the skos:narrower children of whichever concept(s) declare
 *      skos:inScheme pointing at the scheme. Skosmos' "concept
 *      neighbourhood" exports mark only that one anchor concept as
 *      skos:inScheme; its narrower children are the thesaurus' real
 *      enum members (e.g. in platforms.rdf, "Earth Observation
 *      Satellite" is the anchor and its 121 narrower concepts are the
 *      actual platform names).
 *
 * Usage:
 *   node skosmos-to-rdf.js <input.rdf> <output.rdf>
 */

const fs = require("fs");
const path = require("path");

const SKOS_CONCEPT_SCHEME = "http://www.w3.org/2004/02/skos/core#ConceptScheme";
const SKOS_CONCEPT = "http://www.w3.org/2004/02/skos/core#Concept";

const IMPLICIT_TYPES = {
  "skos:Concept": SKOS_CONCEPT,
  "skos:ConceptScheme": SKOS_CONCEPT_SCHEME,
};

// ---------- XML parsing ----------
// Unlike the generic export format (every subject wrapped in a plain
// <rdf:Description>), a Skosmos export names each container element after
// its rdf:type (<skos:Concept>, <skos:ConceptScheme>). Both forms can
// appear in the same file, so all three container tags are matched here.

const XML_ENTITIES = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

/** Replaces numeric and named XML entities (e.g. `&amp;`, `&#39;`) with their characters. */
function decodeEntities(text) {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, ref) => {
    if (ref[0] === "#") {
      const code = ref[1] === "x" || ref[1] === "X" ? parseInt(ref.slice(2), 16) : parseInt(ref.slice(1), 10);
      return String.fromCodePoint(code);
    }
    return XML_ENTITIES[ref] ?? match;
  });
}

/** Escapes text for use inside XML element content. */
function escapeXmlText(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escapes text for use inside a double-quoted XML attribute value. */
function escapeXmlAttr(text) {
  return escapeXmlText(text).replace(/"/g, "&quot;");
}

/** Parses a raw `name="value"` attribute string into a plain object, decoding entities. */
function parseAttrs(attrString) {
  const attrs = {};
  const attrPattern = /([\w:-]+)="([^"]*)"/g;
  let match;
  while ((match = attrPattern.exec(attrString)) !== null) {
    attrs[match[1]] = decodeEntities(match[2]);
  }
  return attrs;
}

/** Parses the immediate (non-nested) children of a container block into
 *  a list of { predicate, resource?, value?, lang? }. */
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
 *  container block that shares the same rdf:about into a single node. */
function parseRdfXml(xml) {
  const nodesByUri = new Map();
  const blockPattern = /<(rdf:Description|skos:Concept|skos:ConceptScheme)\s+([^>]*)>([\s\S]*?)<\/\1>/g;
  let match;
  while ((match = blockPattern.exec(xml)) !== null) {
    const [, tagName, attrString, blockContent] = match;
    const uri = parseAttrs(attrString)["rdf:about"];
    if (!uri) continue;

    let node = nodesByUri.get(uri);
    if (!node) {
      node = { uri, types: new Set(), props: new Map() };
      nodesByUri.set(uri, node);
    }

    const implicitType = IMPLICIT_TYPES[tagName];
    if (implicitType) node.types.add(implicitType);

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

/** Collects a predicate's resource (URI) values, skipping literals. */
function getResources(node, predicate) {
  return (node.props.get(predicate) ?? []).map((v) => v.resource).filter((r) => r !== undefined);
}

/** Picks a readable literal { value, lang } from a predicate's values (prefers 'en'). */
function getLiteral(node, predicate) {
  const literals = (node.props.get(predicate) ?? []).filter((v) => v.value !== undefined);
  const english = literals.find((v) => v.lang === "en" || v.lang === undefined);
  return english ?? literals[0];
}

function getLabel(node, predicate) {
  return getLiteral(node, predicate)?.value;
}

/** Safe filename derived from the last segment of a URI (used only as a title fallback). */
function slugFromUri(uri) {
  return uri.replace(/\/+$/, "").split("/").pop() ?? "thesaurus";
}

// ---------- Core of the conversion ----------

/** Resolves a scheme's top concepts, preferring its own skos:hasTopConcept and
 *  falling back to the skos:narrower children of its skos:inScheme anchor concept(s). */
function resolveTopConceptUris(schemeNode, nodesByUri) {
  const direct = getResources(schemeNode, "skos:hasTopConcept");
  if (direct.length > 0) return { topUris: direct, source: "skos:hasTopConcept" };

  const anchors = Array.from(nodesByUri.values()).filter((n) =>
    getResources(n, "skos:inScheme").includes(schemeNode.uri)
  );
  if (anchors.length === 0) {
    throw new Error(
      `Concept scheme <${schemeNode.uri}> has no skos:hasTopConcept and no concept declares ` +
        `skos:inScheme pointing at it — can't determine its top concepts.`
    );
  }

  const topUris = [];
  const seen = new Set();
  for (const anchor of anchors) {
    for (const narrowerUri of getResources(anchor, "skos:narrower")) {
      if (!seen.has(narrowerUri)) {
        seen.add(narrowerUri);
        topUris.push(narrowerUri);
      }
    }
  }
  if (topUris.length === 0) {
    const anchorLabels = anchors.map((a) => getLabel(a, "skos:prefLabel") ?? a.uri).join(", ");
    throw new Error(
      `Concept scheme <${schemeNode.uri}>: anchor concept(s) [${anchorLabels}] found via skos:inScheme ` +
        `have no skos:narrower children — can't determine top concepts.`
    );
  }

  const anchorLabels = anchors.map((a) => getLabel(a, "skos:prefLabel") ?? a.uri).join(", ");
  return { topUris, source: `skos:inScheme anchor (${anchorLabels}) -> skos:narrower` };
}

/** Converts one concept scheme into { schemeUri, title, titleLang, concepts }, where
 *  concepts is a deduplicated (by label) list of { uri, label, labelLang, notation }. */
function convertScheme(schemeNode, nodesByUri) {
  const titleLiteral = getLiteral(schemeNode, "dct:title") ?? getLiteral(schemeNode, "rdfs:label");
  const title = titleLiteral?.value ?? slugFromUri(schemeNode.uri);
  const titleLang = titleLiteral?.lang;

  const { topUris, source } = resolveTopConceptUris(schemeNode, nodesByUri);

  const concepts = [];
  const seenLabels = new Set();
  for (const uri of topUris) {
    const node = nodesByUri.get(uri);
    if (!node) {
      console.warn(`  ! skipping <${uri}>: not present in the source graph`);
      continue;
    }
    const labelLiteral = getLiteral(node, "skos:prefLabel");
    if (!labelLiteral) {
      console.warn(`  ! skipping <${uri}>: no skos:prefLabel`);
      continue;
    }
    if (seenLabels.has(labelLiteral.value)) continue;
    seenLabels.add(labelLiteral.value);
    concepts.push({
      uri,
      label: labelLiteral.value,
      labelLang: labelLiteral.lang,
      notation: getLiteral(node, "skos:notation"),
    });
  }

  if (concepts.length === 0) {
    throw new Error(`Concept scheme <${schemeNode.uri}> ("${title}") resolved zero usable top concepts.`);
  }

  return { schemeUri: schemeNode.uri, title, titleLang, concepts, source };
}

// ---------- Artifact generation ----------

const NAMESPACES = {
  "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  "skos": "http://www.w3.org/2004/02/skos/core#",
  "dct": "http://purl.org/dc/terms/",
  "rdfs": "http://www.w3.org/2000/01/rdf-schema#",
};

/** Renders one <rdf:Description rdf:about="uri"> block from a list of pre-built child lines. */
function renderDescription(uri, childLines) {
  const body = childLines.map((line) => `\t${line}`).join("\n");
  return `<rdf:Description rdf:about="${escapeXmlAttr(uri)}">\n${body}\n</rdf:Description>`;
}

/** Builds the full RDF/XML document (generic <rdf:Description> form) for the converted schemes. */
function buildRdfXml(results) {
  const blocks = [];

  for (const result of results) {
    const titleLangAttr = result.titleLang ? ` xml:lang="${escapeXmlAttr(result.titleLang)}"` : "";
    const schemeLines = [
      `<dct:title${titleLangAttr}>${escapeXmlText(result.title)}</dct:title>`,
      `<rdf:type rdf:resource="${SKOS_CONCEPT_SCHEME}"/>`,
      ...result.concepts.map((c) => `<skos:hasTopConcept rdf:resource="${escapeXmlAttr(c.uri)}"/>`),
    ];
    blocks.push(renderDescription(result.schemeUri, schemeLines));

    for (const concept of result.concepts) {
      const labelLangAttr = concept.labelLang ? ` xml:lang="${escapeXmlAttr(concept.labelLang)}"` : "";
      const conceptLines = [
        `<rdf:type rdf:resource="${SKOS_CONCEPT}"/>`,
        `<skos:prefLabel${labelLangAttr}>${escapeXmlText(concept.label)}</skos:prefLabel>`,
      ];
      if (concept.notation) {
        const notationLangAttr = concept.notation.lang ? ` xml:lang="${escapeXmlAttr(concept.notation.lang)}"` : "";
        conceptLines.push(`<skos:notation${notationLangAttr}>${escapeXmlText(concept.notation.value)}</skos:notation>`);
      }
      conceptLines.push(`<skos:topConceptOf rdf:resource="${escapeXmlAttr(result.schemeUri)}"/>`);
      blocks.push(renderDescription(concept.uri, conceptLines));
    }
  }

  const nsAttrs = Object.entries(NAMESPACES)
    .map(([prefix, uri]) => `\txmlns:${prefix}="${uri}"`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rdf:RDF\n${nsAttrs}>\n\n${blocks.join("\n\n")}\n\n</rdf:RDF>\n`;
}

// ---------- CLI entry point ----------

function main() {
  const [, , inputPath, outputPath] = process.argv;

  if (!inputPath || !outputPath) {
    console.error("Usage: skosmos-to-rdf.js <input.rdf> <output.rdf>");
    process.exit(1);
  }

  const xml = fs.readFileSync(inputPath, "utf-8");
  const nodesByUri = parseRdfXml(xml);

  const schemeNodes = Array.from(nodesByUri.values()).filter((n) => n.types.has(SKOS_CONCEPT_SCHEME));
  if (schemeNodes.length === 0) {
    throw new Error("No skos:ConceptScheme found in the RDF/XML graph.");
  }

  const results = schemeNodes.map((schemeNode) => convertScheme(schemeNode, nodesByUri));
  for (const result of results) {
    console.log(`[${result.title}] via ${result.source} — ${result.concepts.length} top concepts:`);
    console.log(`  ${JSON.stringify(result.concepts.map((c) => c.label))}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildRdfXml(results), "utf-8");
  console.log(`RDF/XML written: ${outputPath}`);
}

main();
