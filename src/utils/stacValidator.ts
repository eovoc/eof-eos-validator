import Ajv, { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";
import {ValidationResult} from "./ValidationResult";

const ajv = new Ajv({ allErrors: true, validateSchema: true, strict: true });
addFormats(ajv);

try { ajv.addSchema(draft7MetaSchema, "http://json-schema.org/draft-07/schema"); } catch {}

// Schema files are served from /schemas/ as static assets
const BASE = process.env.PUBLIC_URL ?? "";

let mainSchema: any;
const mainSchemaReady: Promise<void> = (async () => {
    const VALIDATION_SCHEMA = `${BASE}/schemas/stac.json`;
    const res = await fetch(VALIDATION_SCHEMA);
    if (!res.ok) throw new Error(`Failed to load validation schema: ${res.status} ${res.statusText}`);
    mainSchema = await res.json();
})();


export async function stacValidator(data: unknown): Promise<ValidationResult> {

    await mainSchemaReady;

    const validate = ajv.compile(mainSchema);
    const valid = validate(data) as boolean;
    return { valid, errors: validate.errors ?? null };
}
