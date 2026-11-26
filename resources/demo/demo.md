ajv validate --spec=draft2019 -c ajv-formats     -m "public/schemas/json-schema-draft-07.json"     -s "public/schemas/eof-eos-schema-strict.json"     -r "public/schemas/dqc.json" -r "public/schemas/mdj.json"     -d "resources/example/Example_Wrong.json" --all-errors


ajv validate --spec=draft2019 -c ajv-formats -m "public/schemas/json-schema-draft-07.json" -s "resources/demo/schema-modified.json" -r "public/schemas/dqc.json" -r "public/schemas/mdj.json" -d "public/examples/Example-Normal-Valid.json" --all-errors