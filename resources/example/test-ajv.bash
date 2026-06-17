# Requires ajv-cli to be installed, see: npm install ajv-cli
ajv validate -d "example-biomass.json" -s "eo-geojson-schema-standalone-flexible-draft07.json" --strict=false -r "dqc.json" -r "mdj.json"