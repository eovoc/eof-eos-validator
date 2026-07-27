#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RDF_DIR="$SCRIPT_DIR/rdf"
SCHEMA_DIR="$SCRIPT_DIR/../public/schemas/thesaurus-rdf"

rm -rf "$SCHEMA_DIR"
mkdir -p "$SCHEMA_DIR"

while IFS= read -r -d '' input; do
  echo "Converting $input"
  node "$SCRIPT_DIR/rdf-to-jsonschema.js" "$input" "$SCHEMA_DIR"
done < <(find "$RDF_DIR" -type f -name "*.rdf" -print0)

# Merge every generated JSON Schema into a single thesaurus.json, since a
# static SPA can't fetch an arbitrary number of files without first knowing
# their names. Each scheme's schema becomes a `definitions` entry keyed by
# its filename (sans extension), addressable as
# "eof-eos/thesaurus#/definitions/<name>"; the per-scheme files are removed
# once merged.
node -e "
const fs = require('fs');
const path = require('path');
const dir = process.argv[1];
const files = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .sort();

const definitions = {};
for (const file of files) {
  const schema = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
  const name = path.basename(file, '.json');
  definitions[name] = {
    title: schema.title,
    description: schema.description,
    type: schema.type,
    enum: schema.enum
  };
  fs.unlinkSync(path.join(dir, file));
}

const merged = {
  '\$schema': 'https://json-schema.org/draft/07/schema',
  '\$id': 'eof-eos/thesaurus',
  definitions
};
const mergedPath = path.join(dir, 'thesaurus.json');
fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2) + '\n');
console.log('Merged schema written:', mergedPath);
" "$SCHEMA_DIR"

# Embed the merged thesaurus definitions into eof-eos-schema.json as a
# dedicated "definitions.thesaurus" section (kept last among definitions),
# so thesaurus enums resolve as local $refs, e.g.
# "#/definitions/thesaurus/acquisition-station-types", without a second
# fetch at runtime. "definitions" is a real JSON Schema keyword, so nesting
# under it (rather than a bare top-level "thesaurus" key) keeps the file
# valid under Ajv's strict mode. Re-running this replaces the section in
# place rather than duplicating or reordering it.
MAIN_SCHEMA="$SCRIPT_DIR/../public/schemas/eof-eos-schema.json"
node -e "
const fs = require('fs');
const [, mergedPath, mainSchemaPath] = process.argv;
const merged = JSON.parse(fs.readFileSync(mergedPath, 'utf-8'));
const mainSchema = JSON.parse(fs.readFileSync(mainSchemaPath, 'utf-8'));
const { thesaurus, ...restDefinitions } = mainSchema.definitions;
mainSchema.definitions = { ...restDefinitions, thesaurus: merged.definitions };
const json = JSON.stringify(mainSchema, null, '\t').replace(/\n/g, '\r\n');
fs.writeFileSync(mainSchemaPath, json + '\r\n');
console.log('Thesaurus section embedded in', mainSchemaPath);
" "$SCHEMA_DIR/thesaurus.json" "$MAIN_SCHEMA"
