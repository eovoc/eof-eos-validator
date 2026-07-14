#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKOS_DIR="$SCRIPT_DIR/skos"
SCHEMA_DIR="$SCRIPT_DIR/schema"

mkdir -p "$SCHEMA_DIR"

for input in "$SKOS_DIR"/*.json; do
  echo "Converting $input"
  npx ts-node "$SCRIPT_DIR/skos-to-jsonschema.ts" "$input" "$SCHEMA_DIR"
done
