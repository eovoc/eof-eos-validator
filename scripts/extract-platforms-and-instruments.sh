#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RDF_DIR="$SCRIPT_DIR/rdf"
SKOSMOS_FILE="${1:-$SCRIPT_DIR/skosmos/esa-thesauri.rdf}"

node "$SCRIPT_DIR/extract-thesaurus-scheme.js" \
  "$SKOSMOS_FILE" \
  "https://earth.esa.int/concepts/concept_scheme/platforms" \
  "$RDF_DIR/platforms.rdf" --mode=leaves

node "$SCRIPT_DIR/extract-thesaurus-scheme.js" \
  "$SKOSMOS_FILE" \
  "https://earth.esa.int/concepts/concept_scheme/instruments" \
  "$RDF_DIR/instruments.rdf" --mode=leaves