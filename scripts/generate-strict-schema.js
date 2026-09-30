#!/usr/bin/env node
/**
 * generate-strict-schema.js
 *
 * Generates the "strict" variant of an EOF-EOS schema: the same schema with
 * "unevaluatedProperties": false added to its object definitions. The app loads
 * the output in 'strict' mode (config.json "ogcStrictValidationSchema"): re-run
 * this script whenever eof-eos-schema.json changes.
 *
 * The output keeps the checked-in formatting of eof-eos-schema.json (tab
 * indentation, CRLF line endings).
 *
 * Usage:
 *   node generate-strict-schema.js [input.json] [output.json]
 *
 * Defaults: public/schemas/eof-eos-schema.json -> public/schemas/eof-eos-schema-strict.json
 */

const fs = require("fs");
const path = require("path");

const SCHEMAS_DIR = path.resolve(__dirname, "..", "public", "schemas");

const IN_PLACE_APPLICATORS = ["allOf", "anyOf", "oneOf", "not", "if", "then", "else"];

// Names of the local definitions referenced ("$ref": "#/definitions/X") from an in-place
// applicator (allOf/anyOf/...): they are fragments merged with sibling schemas at the same
// instance level, so closing them would reject the properties their siblings declare.
function findFragmentDefinitions(schema) {
  const fragments = new Set();
  const collectRef = (branch) => {
    const match = /^#\/definitions\/([^/]+)$/.exec((branch && branch.$ref) || "");
    if (match) fragments.add(match[1]);
  };
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (IN_PLACE_APPLICATORS.includes(key)) {
        (Array.isArray(value) ? value : [value]).forEach(collectRef);
      }
      walk(value);
    }
  };
  walk(schema);
  return fragments;
}

/**
 * Strict mode: forbid unknown properties by adding "unevaluatedProperties": false to every
 * object definition, except fragments (see above) and definitions that already decide
 * explicitly via additionalProperties/unevaluatedProperties. The enclosing definition's
 * unevaluatedProperties still covers the properties evaluated by its fragments.
 * @param {any} schema
 * @returns {any} a closed copy; the input is left untouched.
 */
function closeDefinitions(schema) {
  const closed = JSON.parse(JSON.stringify(schema));
  const fragments = findFragmentDefinitions(closed);
  for (const [name, definition] of Object.entries(closed.definitions || {})) {
    if (!definition || definition.type !== "object" || fragments.has(name)) continue;
    if ("additionalProperties" in definition || "unevaluatedProperties" in definition) continue;
    definition.unevaluatedProperties = false;
  }
  return closed;
}

function main() {
  const [, , inputArg, outputArg] = process.argv;
  const inputPath = path.resolve(inputArg || path.join(SCHEMAS_DIR, "eof-eos-schema.json"));
  const outputPath = path.resolve(outputArg || path.join(SCHEMAS_DIR, "eof-eos-schema-strict.json"));

  const schema = JSON.parse(fs.readFileSync(inputPath, "utf8"));
  const strictSchema = closeDefinitions(schema);

  const closed = Object.keys(strictSchema.definitions || {}).filter(
    (name) => strictSchema.definitions[name].unevaluatedProperties === false
  );

  const json = JSON.stringify(strictSchema, null, "\t").replace(/\n/g, "\r\n");
  fs.writeFileSync(outputPath, json + "\r\n");

  console.log(`Wrote ${outputPath}`);
  console.log(`Definitions with "unevaluatedProperties": false: ${closed.join(", ")}`);
}

main();
