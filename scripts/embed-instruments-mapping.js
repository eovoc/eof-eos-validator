/**
 * embed-instruments-mapping.js
 *
 * Embeds the { allOf: [...] } schema produced by
 * build-platform-instruments-mapping.js into eof-eos-schema.json as
 * "definitions.additional-rules.instruments-mapping". Re-running this
 * replaces the mapping rather than duplicating it; other entries of
 * "definitions.additional-rules" are kept. That section must already exist
 * in the target schema.
 *
 * The mapping is not embedded into eof-eos-schema-strict.json directly:
 * regenerate the strict and soft variants afterwards
 * (generate-strict-schema.sh, generate-soft-schema.sh).
 *
 * eof-eos-schema.json is checked in with tab indentation and CRLF
 * line endings, so the rewrite preserves that formatting rather than
 * defaulting to Node's usual 2-space/LF output.
 *
 * Usage:
 *   node embed-instruments-mapping.js <instruments-mapping.json> <eof-eos-schema.json>
 */

const fs = require("fs");

function main() {
  const [, , mappingPath, mainSchemaPath] = process.argv;

  if (!mappingPath || !mainSchemaPath) {
    console.error("Usage: embed-instruments-mapping.js <instruments-mapping.json> <eof-eos-schema.json>");
    process.exit(1);
  }

  const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf-8"));
  const mainSchema = JSON.parse(fs.readFileSync(mainSchemaPath, "utf-8"));

  // Overwrite the previous mapping with the new one.
  mainSchema.definitions['additional-rules']['instruments-mapping'] = mapping;

  const json = JSON.stringify(mainSchema, null, "\t").replace(/\n/g, "\r\n");
  fs.writeFileSync(mainSchemaPath, json + "\r\n");
  console.log("instruments-mapping section embedded in", mainSchemaPath);
}

main();
