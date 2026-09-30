#!/usr/bin/env node
/**
 * generate-soft-schema.js
 *
 * Generates the "soft" variant of an EOF-EOS schema: the same schema without its
 * "additional-rules" definition (the platform/instruments mapping) and without the
 * reference to it in AcquisitionInformation. The app loads the output in 'soft' mode
 * (config.json "ogcSoftValidationSchema"): re-run this script whenever
 * eof-eos-schema.json changes.
 *
 * The output keeps the checked-in formatting of eof-eos-schema.json (tab
 * indentation, CRLF line endings).
 *
 * Usage:
 *   node generate-soft-schema.js [input.json] [output.json]
 *
 * Defaults: public/schemas/eof-eos-schema.json -> public/schemas/eof-eos-schema-soft.json
 */

const fs = require("fs");
const path = require("path");

const SCHEMAS_DIR = path.resolve(__dirname, "..", "public", "schemas");

function main() {
  const [, , inputArg, outputArg] = process.argv;
  const inputPath = path.resolve(inputArg || path.join(SCHEMAS_DIR, "eof-eos-schema.json"));
  const outputPath = path.resolve(outputArg || path.join(SCHEMAS_DIR, "eof-eos-schema-soft.json"));

  const schema = JSON.parse(fs.readFileSync(inputPath, "utf8"));

  delete schema.definitions["additional-rules"];

  // AcquisitionInformation.allOf references #/definitions/additional-rules/...: drop those
  // entries, and the allOf itself once empty.
  const acquisitionInformation = schema.definitions.AcquisitionInformation;
  acquisitionInformation.allOf = (acquisitionInformation.allOf || []).filter(
    (rule) => !(rule.$ref || "").startsWith("#/definitions/additional-rules/")
  );
  if (acquisitionInformation.allOf.length === 0) delete acquisitionInformation.allOf;

  const json = JSON.stringify(schema, null, "\t").replace(/\n/g, "\r\n");
  fs.writeFileSync(outputPath, json + "\r\n");

  console.log(`Wrote ${outputPath}`);
}

main();
