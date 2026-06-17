import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";

const ajv = new Ajv({ allErrors: true, validateSchema: true, strict: true });
addFormats(ajv);

try { ajv.addSchema(draft7MetaSchema, "http://json-schema.org/draft-07/schema"); } catch {}

// Schema files are served from /schemas/ as static assets so they can be
// overridden at runtime (e.g. via a Kubernetes ConfigMap mount).
const STATIC_SCHEMAS = [
  "/schemas/mdj.json",
  "/schemas/dqc.json",
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

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

export async function validateJson(data: unknown, schema: object): Promise<ValidationResult> {
  await schemasReady;
  const validate = ajv.compile(schema);
  const valid = validate(data) as boolean;
  return { valid, errors: validate.errors ?? null };
}
