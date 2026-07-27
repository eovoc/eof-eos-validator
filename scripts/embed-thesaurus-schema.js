/**
 * embed-thesaurus-schema.js
 *
 * Embeds a merged thesaurus schema (as produced by
 * merge-thesaurus-schemas.js) into eof-eos-schema.json as a dedicated
 * "definitions.thesaurus" section (kept last among definitions), so
 * thesaurus enums resolve as local $refs, e.g.
 * "#/definitions/thesaurus/acquisition-station-types", without a second
 * fetch at runtime. "definitions" is a real JSON Schema keyword, so
 * nesting under it (rather than a bare top-level "thesaurus" key) keeps
 * the file valid under Ajv's strict mode. Re-running this replaces the
 * section in place rather than duplicating or reordering it.
 *
 * eof-eos-schema.json is checked in with tab indentation and CRLF line
 * endings, so the rewrite preserves that formatting rather than
 * defaulting to Node's usual 2-space/LF output.
 *
 * Usage:
 *   node embed-thesaurus-schema.js <thesaurus.json> <eof-eos-schema.json>
 */

const fs = require("fs");

function main() {
  const [, , mergedPath, mainSchemaPath] = process.argv;

  if (!mergedPath || !mainSchemaPath) {
    console.error("Usage: embed-thesaurus-schema.js <thesaurus.json> <eof-eos-schema.json>");
    process.exit(1);
  }

  const merged = JSON.parse(fs.readFileSync(mergedPath, "utf-8"));
  const mainSchema = JSON.parse(fs.readFileSync(mainSchemaPath, "utf-8"));

  const { thesaurus, ...restDefinitions } = mainSchema.definitions;
  mainSchema.definitions = { ...restDefinitions, thesaurus: merged.definitions };

  const json = JSON.stringify(mainSchema, null, "\t").replace(/\n/g, "\r\n");
  fs.writeFileSync(mainSchemaPath, json + "\r\n");
  console.log("Thesaurus section embedded in", mainSchemaPath);
}

main();
