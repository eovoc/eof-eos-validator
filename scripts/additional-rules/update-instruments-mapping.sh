#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESOURCES_DIR="$SCRIPT_DIR/../../resources"
SKOSMOS_FILE="${1:-$RESOURCES_DIR/skosmos/esa-thesauri.rdf}"
STRICT_SCHEMA="${2:-$SCRIPT_DIR/../../public/schemas/eof-eos-schema-strict-additional-rules.json}"

node "$SCRIPT_DIR/build-platform-instruments-mapping.js" \
  "$SKOSMOS_FILE" \
  "$RESOURCES_DIR/mapping/platform-instruments-allof.json"

node "$SCRIPT_DIR/embed-instruments-mapping.js" \
  "$RESOURCES_DIR/mapping/platform-instruments-allof.json" \
  "$STRICT_SCHEMA"
