#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RDF_DIR="$SCRIPT_DIR/../../resources/rdf"
SCHEMA_DIR="${1:-$SCRIPT_DIR/../../public/schemas/thesaurus-rdf}"
MAIN_SCHEMA="${2:-$SCRIPT_DIR/../../public/schemas/eof-eos-schema.json}"

rm -rf "$SCHEMA_DIR"
mkdir -p "$SCHEMA_DIR"

# Convert every rdf file into jsonschema files (n jsonschema per rdf file).
while IFS= read -r -d '' input; do
  echo "#################"
  echo "Converting $input"
  echo "#################"
  node "$SCRIPT_DIR/rdf-to-jsonschema.js" "$input" "$SCHEMA_DIR"
  echo "-----------------"
done < <(find "$RDF_DIR" -type f -name "*.rdf" -print0)

# Merge all jsonschema files into a single one.
node "$SCRIPT_DIR/merge-thesaurus-schemas.js" "$SCHEMA_DIR"

# embed the generated jsonschema into the main schema.
node "$SCRIPT_DIR/embed-thesaurus-schema.js" "$SCHEMA_DIR/thesaurus.json" "$MAIN_SCHEMA"
