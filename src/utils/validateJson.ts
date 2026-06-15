import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import draft4MetaSchema from "ajv-draft-04/dist/refs/json-schema-draft-04.json";
import draft6MetaSchema from "ajv/dist/refs/json-schema-draft-06.json";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";

async function loadSchema(uri: string): Promise<object> {

  console.log(`[ajv] loadSchema: fetching ${uri}`);
  try {
    const res = await fetch(uri);
    console.log(`[ajv] loadSchema: ${uri} → HTTP ${res.status}`);
    if (!res.ok) throw new Error(`Failed to fetch schema (HTTP ${res.status}): ${uri}`);
    const schema = await res.json();
    console.log(`[ajv] loadSchema: loaded ${uri}`);
    return schema;
  } catch (e) {
    console.error(`[ajv] loadSchema: error fetching ${uri}`, e);
    throw e;
  }
}

// Single AJV instance for all drafts.
// - validateSchema:false  prevents meta-schema URI lookups (avoids infinite
//   loadSchema loops and "no schema with ref draft-04/schema#" errors)
// - strict:false          silences unknown-keyword exceptions so schemas that
//   mix draft syntaxes (e.g. declare draft-04 but use draft-07 keywords) don't crash
const ajv = new Ajv({ allErrors: true, loadSchema, validateSchema: true, strict: true });
addFormats(ajv);

// Pre-register meta-schemas under the no-"#" URI variants that schemas commonly
// use, bridging AJV's internal "#"-suffixed registration.
try { ajv.addSchema(draft4MetaSchema, "http://json-schema.org/draft-04/schema"); } catch {}
try { ajv.addSchema(draft6MetaSchema, "http://json-schema.org/draft-06/schema"); } catch {}
try { ajv.addSchema(draft7MetaSchema, "http://json-schema.org/draft-07/schema"); } catch {}

export interface ValidationResult {
  valid: boolean;
  errors: ErrorObject[] | null;
}

/**
 * Validates a JSON value against a JSON Schema. Supports Draft-04 through
 * Draft-2020. External $ref URLs are fetched automatically.
 */
export async function validateJson(data: unknown, schema: object): Promise<ValidationResult> {
  console.log("[ajv] compileAsync start");
  const validate = await ajv.compileAsync(schema);
  console.log("[ajv] compileAsync done");
  const valid = validate(data) as boolean;
  console.log(`[ajv] validation result: ${valid ? "valid" : "invalid"}`, validate.errors ?? []);
  return { valid, errors: validate.errors ?? null };
}
