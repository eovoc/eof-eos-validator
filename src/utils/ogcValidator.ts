import Ajv from "ajv";
import addFormats from "ajv-formats";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";
import {ValidationReport, ValidationResult} from "./ValidationResult";

const ajv = new Ajv({ allErrors: true, validateSchema: true, strict: true });
addFormats(ajv);

try { ajv.addSchema(draft7MetaSchema, "http://json-schema.org/draft-07/schema"); } catch {}

// Schema files are served from /schemas/ as static assets
const BASE = process.env.PUBLIC_URL ?? "";

const STATIC_SCHEMAS = [
  `${BASE}/schemas/mdj.json`,
  `${BASE}/schemas/dqc.json`,
  `${BASE}/schemas/thesaurus/acquisitionstation.json`,
  `${BASE}/schemas/thesaurus/platforms.json`
];

const schemasReady: Promise<void> = (async () => {
  for (const path of STATIC_SCHEMAS) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      const schema = await res.json();
      try { ajv.addSchema(schema); } catch {}
    } catch {}
  }
})();

let mainSchema: any;
const mainSchemaReady: Promise<void> = (async () => {
  const VALIDATION_SCHEMA = `${BASE}/schemas/eof-eos-schema.json`;
  const res = await fetch(VALIDATION_SCHEMA);
  if (!res.ok) throw new Error(`Failed to load validation schema: ${res.status} ${res.statusText}`);
  mainSchema = await res.json();
})();

export async function ogcValidator(data: unknown): Promise<ValidationReport> {

  await schemasReady;
  await mainSchemaReady;

  const validate = ajv.compile(mainSchema);
  const valid = validate(data) as boolean;
  console.log("validation result:",validate);
  const result = { valid, schema: `${process.env.PUBLIC_URL}/schemas/eof-eos-schema.json`, errors: validate.errors ?? null };
  const report = { valid, results: [result]}
  return report;
}
