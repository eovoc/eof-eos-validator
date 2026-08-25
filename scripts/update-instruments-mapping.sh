#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RDF_DIR="$SCRIPT_DIR/rdf"
SKOSMOS_FILE="${1:-$SCRIPT_DIR/skosmos/esa-thesauri.rdf}"
STRICT_SCHEMA="${2:-$SCRIPT_DIR/../public/schemas/eof-eos-schema.json}"

node "$SCRIPT_DIR/build-platform-instruments-mapping.js" \
  "$SKOSMOS_FILE" \
  "$SCRIPT_DIR/mapping/platform-instruments-allof.json"

node "$SCRIPT_DIR/embed-instruments-mapping.js" \
  "$SCRIPT_DIR/mapping/platform-instruments-allof.json" \
  "$STRICT_SCHEMA"
