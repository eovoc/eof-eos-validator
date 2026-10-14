/**
 * build-platform-instruments-mapping.js
 *
 * Reads ESA's merged thesaurus export (scripts/skosmos/esa-thesauri.rdf)
 * and, for every platform (satellite), emits a JSON Schema `if`/`then`
 * constraint restricting which instruments that platform may be paired
 * with — derived from each instrument's sosa:isHostedBy links back to
 * the platform concept(s) it flies on. Output is the `allOf` array used
 * by the `AcquisitionInformation` definition in
 * public/schemas/eof-eos-schema.json (that file currently holds a
 * placeholder allOf with made-up PLAT_A/PLAT_B/PLAT_C, INSTR_1..4 values —
 * this script's output is meant to replace it):
 *
 *   {
 *     "allOf": [
 *       {
 *         "if": {
 *           "properties": {
 *             "platform": {
 *               "type": "object",
 *               "properties": { "platformShortName": { "const": "Metop-C" } }
 *             }
 *           }
 *         },
 *         "then": {
 *           "properties": {
 *             "instrument": {
 *               "type": "object",
 *               "properties": { "instrumentShortName": { "enum": ["AMSU-A", "ASCAT", ...] } }
 *             }
 *           }
 *         }
 *       },
 *       ...
 *     ]
 *   }
 *
 * platformShortName/instrumentShortName values are skos:prefLabel, matching
 * the enums generated from scripts/rdf/platforms.rdf and
 * scripts/rdf/instruments.rdf (the definitions.thesaurus.platforms /
 * .instruments $refs those two properties resolve to).
 *
 * sosa:isHostedBy targets are individual satellite concepts (e.g.
 * "Metop-C"), not the coarser satellite-family top concepts platforms.rdf
 * used to have (e.g. "Metop") — this script reports at that same
 * fine-grained instance level, matching the source data as-is.
 *
 * (esa-thesauri.rdf also carries the inverse sosa:hosts on the platform
 * side; every sosa:isHostedBy triple has a matching sosa:hosts triple, so
 * reading isHostedBy alone is sufficient.)
 *
 * Usage:
 *   node build-platform-instruments-mapping.js [input.rdf] [output.json]
 *
 * - input.rdf  — defaults to scripts/skosmos/esa-thesauri.rdf.
 * - output.json — optional; if omitted, the schema is printed to stdout.
 */

const fs = require("fs");
const path = require("path");

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

/** Picks a readable label from a predicate's literal values (prefers 'en'). */
function getLabel(node, predicate) {
  const literals = (node.props.get(predicate) ?? []).filter((v) => v.value !== undefined);
  const english = literals.find((v) => v.lang === "en" || v.lang === undefined);
  return (english ?? literals[0])?.value;
}

// ---------- Core ----------

/** Builds { platformUri -> { label, uri, instruments: [{ uri, label }] } }, from every
 *  concept's sosa:isHostedBy links, sorted by label at both levels. */
function buildPlatformInstrumentMap(nodesByUri) {
  const platforms = new Map();

  for (const instrument of nodesByUri.values()) {
    if (!instrument.types.has(SKOS_CONCEPT)) continue;
    const platformUris = getResources(instrument, "sosa:isHostedBy");
    if (platformUris.length === 0) continue;

    const instrumentLabel = getLabel(instrument, "skos:prefLabel");
    if (!instrumentLabel) {
      console.warn(`  ! skipping <${instrument.uri}>: no skos:prefLabel`);
      continue;
    }

    for (const platformUri of platformUris) {
      const platformNode = nodesByUri.get(platformUri);
      const platformLabel = platformNode && getLabel(platformNode, "skos:prefLabel");
      if (!platformLabel) {
        console.warn(`  ! skipping isHostedBy <${platformUri}>: not present in the graph or no skos:prefLabel`);
        continue;
      }

      let entry = platforms.get(platformUri);
      if (!entry) {
        entry = { uri: platformUri, label: platformLabel, instruments: [] };
        platforms.set(platformUri, entry);
      }
      entry.instruments.push({ uri: instrument.uri, label: instrumentLabel });
    }
  }

  const result = Array.from(platforms.values());
  for (const entry of result) {
    entry.instruments.sort((a, b) => a.label.localeCompare(b.label));
  }
  result.sort((a, b) => a.label.localeCompare(b.label));
  return result;
}

/** Turns the platform -> instruments report into the { allOf: [...] } JSON Schema
 *  fragment: one { if: platformShortName === label, then: instrumentShortName in enum }
 *  entry per platform, deduplicating instrument labels (an instrument's uri is dropped
 *  here — the schema only needs its skos:prefLabel). */
function buildAllOfSchema(report) {
  const allOf = report.map((platform) => {
    const instrumentLabels = [...new Set(platform.instruments.map((i) => i.label))];
    return {
      if: {
        "type": "object",
        properties: {
          platform: {
            type: "object",
            properties: { platformShortName: { const: platform.label } },
          },
        },
      },
      then: {
        "type": "object",
        properties: {
          instrument: {
            type: "object",
            properties: { instrumentShortName: { enum: instrumentLabels } },
          },
        },
      },
    };
  });

  return { allOf };
}

// ---------- CLI entry point ----------

function main() {
  const [, , inputArg, outputArg] = process.argv;
  const inputPath = inputArg ?? path.join(__dirname, "skosmos", "esa-thesauri.rdf");

  const xml = fs.readFileSync(inputPath, "utf-8");
  const nodesByUri = parseRdfXml(xml);

  const report = buildPlatformInstrumentMap(nodesByUri);
  const totalLinks = report.reduce((sum, p) => sum + p.instruments.length, 0);
  console.error(`${report.length} platforms, ${totalLinks} platform-instrument links (from sosa:isHostedBy).`);

  const schema = buildAllOfSchema(report);
  const json = JSON.stringify(schema, null, 2) + "\n";
  if (outputArg) {
    fs.mkdirSync(path.dirname(outputArg), { recursive: true });
    fs.writeFileSync(outputArg, json, "utf-8");
    console.error(`Schema written: ${outputArg}`);
  } else {
    process.stdout.write(json);
  }
}

main();
