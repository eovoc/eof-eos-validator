SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
npm run validate -- "$SCRIPT_DIR/example-biomass.json" "$SCRIPT_DIR/eo-geojson-schema-standalone-flexible-draft07.json"