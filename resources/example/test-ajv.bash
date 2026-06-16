# Requires ajv-cli to be installed, see: npm install ajv-cli
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ajv validate -d "$SCRIPT_DIR/example-biomass.json" -s "$SCRIPT_DIR/eo-geojson-schema-standalone-flexible-draft07.json" --strict=false -r "dqc.json" -r "mdj.json"