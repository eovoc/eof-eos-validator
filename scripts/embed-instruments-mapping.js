/**
 * embed-instruments-mapping.js
 *
 * Embeds the { allOf: [...] } schema produced by
 * build-platform-instruments-mapping.js into eof-eos-schema-strict.json as
 * a dedicated "definitions.instruments-mapping" section. Re-running this
 * replaces the section in place rather than duplicating or reordering it.
 *
 * eof-eos-schema-strict.json is checked in with tab indentation and CRLF
 * line endings, so the rewrite preserves that formatting rather than
 * defaulting to Node's usual 2-space/LF output.
 *
 * Usage:
 *   node embed-instruments-mapping.js <instruments-mapping.json> <eof-eos-schema-strict.json>
 */

const fs = require("fs");

function main() {
  const [, , mappingPath, mainSchemaPath] = process.argv;

  if (!mappingPath || !mainSchemaPath) {
    console.error("Usage: embed-instruments-mapping.js <instruments-mapping.json> <eof-eos-schema-strict.json>");
    process.exit(1);
  }

  const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
  const mainSchema = JSON.parse(fs.readFileSync(mainSchemaPath, "utf-8"));

  const { "instruments-mapping": _dropped, ...restDefinitions } = mainSchema.definitions;
  mainSchema.definitions = { ...restDefinitions, "instruments-mapping": mapping };

  const json = JSON.stringify(mainSchema, null, "\t").replace(/\n/g, "\r\n");
  fs.writeFileSync(mainSchemaPath, json + "\r\n");
  console.log("instruments-mapping section embedded in", mainSchemaPath);
}

main();
