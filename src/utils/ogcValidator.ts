import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";

const ajv = new Ajv({ allErrors: true, validateSchema: true, strict: true });
addFormats(ajv);

try { ajv.addSchema(draft7MetaSchema, "http://json-schema.org/draft-07/schema"); } catch {}

// Schema files are served from /schemas/ as static assets
const BASE = process.env.PUBLIC_URL ?? "";

const STATIC_SCHEMAS = [
  `${BASE}/schemas/mdj.json`,
  `${BASE}/schemas/dqc.json`,
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
  const VALIDATION_SCHEMA = `${BASE}/schemas/eo-geojson-schema-standalone-flexible-draft07.json`;
  const res = await fetch(VALIDATION_SCHEMA);
  if (!res.ok) throw new Error(`Failed to load validation schema: ${res.status} ${res.statusText}`);
  mainSchema = await res.json();
})();


export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

export async function ogcValidator(data: unknown): Promise<ValidationResult> {

  await schemasReady;
  await mainSchemaReady;

  const validate = ajv.compile(mainSchema);
  const valid = validate(data) as boolean;
  return { valid, errors: validate.errors ?? null };
}
