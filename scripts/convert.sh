#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKOS_DIR="$SCRIPT_DIR/skos"
SCHEMA_DIR="$SCRIPT_DIR/../public/schemas/thesaurus"

mkdir -p "$SCHEMA_DIR"

for input in "$SKOS_DIR"/*.json; do
  echo "Converting $input"
  node "$SCRIPT_DIR/skos-to-jsonschema.js" "$input" "$SCHEMA_DIR"
done

# Regenerate the manifest listing every generated JSON Schema, so the app
# can discover thesaurus schemas at runtime (a static SPA can't list a
# directory's contents on its own).
node -e "
const fs = require('fs');
const path = require('path');
const dir = process.argv[1];
const files = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
  .sort();
fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(files, null, 2) + '\n');
console.log('Manifest written:', path.join(dir, 'manifest.json'));
" "$SCHEMA_DIR"
