/**
 * extract-thesaurus-scheme.js
 *
 * Extracts one skos:ConceptScheme out of ESA's merged thesaurus export
 * (scripts/skosmos/esa-thesauri.rdf, generic <rdf:Description>-based
 * RDF/XML combining the platforms, instruments and earth-topics schemes
 * into one graph) and writes it in the generic form that
 * rdf-to-jsonschema.js expects: a ConceptScheme with dct:title and
 * explicit skos:hasTopConcept links, each top concept carrying
 * skos:topConceptOf back to the scheme.
 *
 * Unlike a Skosmos "concept neighbourhood" export (see skosmos-to-rdf.js),
 * every concept in this file already declares skos:inScheme, so there is
 * no single anchor to key off. Instead, the scheme's real top concept(s)
 * are found by starting at whichever concept(s) declare skos:topConceptOf
 * the scheme, then descending through skos:narrower using one of two
 * strategies (--mode):
 *
 *   - "one-level" (default): skip pure single-child pass-through categories
 *     (e.g. for platforms: Platform -> Space-based Platform -> Earth
 *     Observation Satellite) until reaching a concept whose narrower count
 *     is 0 (a leaf, itself the top concept) or >1 (a branching category,
 *     whose direct children become the top concepts — one flattened level
 *     below the anchor). Fits a scheme with family-grouping semantics,
 *     where e.g. the satellite family "Metop" is itself one top concept
 *     even though it has narrower individual satellites Metop-A/B/C.
 *
 *   - "leaves": recursively collects every leaf concept (no skos:narrower
 *     children at all) anywhere under the root(s), regardless of how many
 *     branching levels deep. Fits a scheme that is a pure multi-level
 *     classification with no family-grouping semantics, where real members
 *     only ever appear as leaves (e.g. instruments: Instrument -> Earth
 *     Remote Sensing Instrument -> Active/Passive Remote Sensing -> ...
 *     -> SAR, MODIS, ...).
 *
 * Usage:
 *   node extract-thesaurus-scheme.js <input.rdf> <schemeUri> <output.rdf> [--mode=one-level|leaves]
 */

const fs = require("fs");
const path = require("path");

const SKOS_CONCEPT_SCHEME = "http://www.w3.org/2004/02/skos/core#ConceptScheme";
const SKOS_CONCEPT = "http://www.w3.org/2004/02/skos/core#Concept";

// ---------- XML parsing ----------
// Every subject in this file is one or more flat <rdf:Description rdf:about="URI">
// blocks; a subject's properties are commonly split across several blocks, so
// blocks sharing the same rdf:about are merged.

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

/** Parses the immediate (non-nested) children of a <rdf:Description> block into
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

/** A concept's skos:narrower children, filtered to those present in the graph as concepts. */
function conceptNarrower(node, nodesByUri) {
  return getResources(node, "skos:narrower").filter((uri) => {
    const child = nodesByUri.get(uri);
    return child && child.types.has(SKOS_CONCEPT);
  });
}

/** Descends from `startUri` through skos:narrower while each concept along the way has
 *  exactly one child, stopping at the first concept whose narrower count is 0 (a leaf,
 *  returned as the sole top concept) or >1 (a branching category, whose direct children
 *  are returned as the top concepts). Suited to a scheme where one flattened level below
 *  the real category anchor is already the desired granularity (e.g. platforms, where a
 *  satellite family like "Metop" is itself one top concept even though it has narrower
 *  individual satellites). */
function resolveOneLevelTopUris(startUri, nodesByUri) {
  let current = nodesByUri.get(startUri);
  const path = [];
  while (current) {
    const narrower = conceptNarrower(current, nodesByUri);
    path.push(getLabel(current, "skos:prefLabel") ?? current.uri);
    if (narrower.length !== 1) {
      return { topUris: narrower.length > 0 ? narrower : [current.uri], path };
    }
    current = nodesByUri.get(narrower[0]);
  }
  return { topUris: [startUri], path };
}

/** Recursively collects every leaf concept (no skos:narrower children) reachable from
 *  `startUri`, in depth-first source order, guarding against cycles. Suited to a scheme
 *  that is a pure multi-level classification with no family-grouping semantics (e.g.
 *  instruments, where actual instrument names only ever appear as leaves under several
 *  levels of category/sub-category nodes). */
function resolveLeafTopUris(startUri, nodesByUri) {
  const leaves = [];
  const visited = new Set();
  const path = [];

  function visit(uri, depth) {
    if (visited.has(uri)) return;
    visited.add(uri);
    const node = nodesByUri.get(uri);
    if (!node) return;
    if (depth === 0) path.push(getLabel(node, "skos:prefLabel") ?? uri);
    const narrower = conceptNarrower(node, nodesByUri);
    if (narrower.length === 0) {
      leaves.push(uri);
      return;
    }
    for (const childUri of narrower) visit(childUri, depth + 1);
  }
  visit(startUri, 0);

  return { topUris: leaves, path: [...path, `... ${leaves.length} leaves`] };
}

/** Resolves a scheme's top concepts by descending from each of its skos:topConceptOf
 *  roots (falling back to inScheme concepts without a skos:broader, for schemes that
 *  don't declare skos:topConceptOf at all), deduplicated by label in source order.
 *  `mode` picks the descent strategy: "one-level" (default) or "leaves". */
function resolveTopConceptUris(schemeNode, nodesByUri, mode) {
  let roots = Array.from(nodesByUri.values()).filter(
    (n) => n.types.has(SKOS_CONCEPT) && getResources(n, "skos:topConceptOf").includes(schemeNode.uri)
  );
  if (roots.length === 0) {
    roots = Array.from(nodesByUri.values()).filter(
      (n) =>
        n.types.has(SKOS_CONCEPT) &&
        getResources(n, "skos:inScheme").includes(schemeNode.uri) &&
        getResources(n, "skos:broader").length === 0
    );
  }
  if (roots.length === 0) {
    throw new Error(`Concept scheme <${schemeNode.uri}> has no skos:topConceptOf root and no rootless concept.`);
  }

  const resolveFromRoot = mode === "leaves" ? resolveLeafTopUris : resolveOneLevelTopUris;

  const topUris = [];
  const seen = new Set();
  const sourceParts = [];
  for (const root of roots) {
    const { topUris: resolved, path } = resolveFromRoot(root.uri, nodesByUri);
    sourceParts.push(path.join(" -> "));
    for (const uri of resolved) {
      if (!seen.has(uri)) {
        seen.add(uri);
        topUris.push(uri);
      }
    }
  }

  return { topUris, source: sourceParts.join(" | ") };
}

/** Converts the target concept scheme into { schemeUri, title, titleLang, concepts }, where
 *  concepts is a deduplicated (by label) list of { uri, label, labelLang, notation }. */
function convertScheme(schemeNode, nodesByUri, mode) {
  // rdfs:label is preferred over dct:title: in esa-thesauri.rdf several scheme nodes
  // (e.g. instruments, earth-topics) carry a dct:title of "ESA Thesaurus" — the whole
  // document's title, not the scheme's own — while their rdfs:label is scheme-specific.
  const titleLiteral = getLiteral(schemeNode, "rdfs:label") ?? getLiteral(schemeNode, "dct:title");
  const title = titleLiteral?.value ?? slugFromUri(schemeNode.uri);
  const titleLang = titleLiteral?.lang;

  const { topUris, source } = resolveTopConceptUris(schemeNode, nodesByUri, mode);

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

/** Builds the full RDF/XML document (generic <rdf:Description> form) for the extracted scheme. */
function buildRdfXml(result) {
  const blocks = [];

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

  const nsAttrs = Object.entries(NAMESPACES)
    .map(([prefix, uri]) => `\txmlns:${prefix}="${uri}"`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<rdf:RDF\n${nsAttrs}>\n\n${blocks.join("\n\n")}\n\n</rdf:RDF>\n`;
}

// ---------- CLI entry point ----------

function main() {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith("--mode="));
  const mode = modeArg ? modeArg.slice("--mode=".length) : "one-level";
  const [inputPath, schemeUri, outputPath] = args.filter((a) => !a.startsWith("--mode="));

  if (!inputPath || !schemeUri || !outputPath) {
    console.error("Usage: extract-thesaurus-scheme.js <input.rdf> <schemeUri> <output.rdf> [--mode=one-level|leaves]");
    process.exit(1);
  }
  if (mode !== "one-level" && mode !== "leaves") {
    console.error(`Unknown --mode "${mode}": expected "one-level" or "leaves".`);
    process.exit(1);
  }

  const xml = fs.readFileSync(inputPath, "utf-8");
  const nodesByUri = parseRdfXml(xml);

  const schemeNode = nodesByUri.get(schemeUri);
  if (!schemeNode || !schemeNode.types.has(SKOS_CONCEPT_SCHEME)) {
    throw new Error(`No skos:ConceptScheme found with URI <${schemeUri}> in ${inputPath}.`);
  }

  const result = convertScheme(schemeNode, nodesByUri, mode);
  console.log(`[${result.title}] via ${result.source} — ${result.concepts.length} top concepts:`);
  console.log(`  ${JSON.stringify(result.concepts.map((c) => c.label))}`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, buildRdfXml(result), "utf-8");
  console.log(`RDF/XML written: ${outputPath}`);
}

main();
