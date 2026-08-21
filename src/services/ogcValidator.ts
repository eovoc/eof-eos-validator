import Ajv, {ErrorObject} from "ajv";
import addFormats from "ajv-formats";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";
import {ValidationReport} from "./ValidationResult";
import {getConfig} from "../config";

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
  const { ogcValidationSchema } = await getConfig();
  const VALIDATION_SCHEMA = `${BASE}/${ogcValidationSchema}`;
  const res = await fetch(VALIDATION_SCHEMA);
  if (!res.ok) throw new Error(`Failed to load validation schema: ${res.status} ${res.statusText}`);
  mainSchema = await res.json();
})();

type Partition = {
  kept: ErrorObject[];
  removed: ErrorObject[];
};

function partitionErrorsBySchemaPath(
    errors: ErrorObject[],
    schemaPathsToExtract: string
): Partition {

  const initial: Partition = { kept: [], removed: [] };
  return errors.reduce((acc, err) => {

    if (err.schemaPath.startsWith(schemaPathsToExtract)) {
      acc.removed.push(err);
    } else {
      acc.kept.push(err);
    }
    return acc;
  }, initial);
}

export async function ogcValidator(data: unknown): Promise<ValidationReport> {

  await schemasReady;
  await mainSchemaReady;

  const { strictValidation } = await getConfig();

  const validate = ajv.compile(mainSchema);
  const valid = validate(data) as boolean;
  let isValid: boolean = valid;
  console.log("validation result:",validate);
  //TODO: filter errors to be treated as warnings (todo: only apply if strict mode is disabled).
  //-> use warnings when strict mode is disabled.
  let errors;
  let warnings;
  if(validate.errors && !strictValidation){
    const errorsToExtract = '#/definitions/additional-rules/';
    const partitionedErrors = partitionErrorsBySchemaPath(validate.errors,errorsToExtract);
    errors = partitionedErrors.kept;
    warnings = partitionedErrors.removed;
    if(errors.length === 0){
      isValid = true;
    }
  }else{
    errors = validate.errors;
    warnings = null;
  }


  console.log('Errors :', errors);
  console.log('Warning :', warnings);
  const result = { valid:isValid, schema: `${process.env.PUBLIC_URL}/schemas/eof-eos-schema.json`, errors: errors ?? null, warnings : warnings};
  return { valid:isValid, results: [result]};
}
