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

node "$SCRIPT_DIR/merge-thesaurus-schemas.js" "$SCHEMA_DIR"

MAIN_SCHEMA="$SCRIPT_DIR/../public/schemas/eof-eos-schema.json"
node "$SCRIPT_DIR/embed-thesaurus-schema.js" "$SCHEMA_DIR/thesaurus.json" "$MAIN_SCHEMA"
