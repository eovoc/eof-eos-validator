import Ajv, {ErrorObject} from "ajv";
import addFormats from "ajv-formats";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";
import {partitionErrorsBySchemaPath, ValidationReport} from "./ValidationResult";
import {getConfig, OgcValidationMode} from "../config";

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

type OgcValidationReport = {
  isValid: boolean
  errors : ErrorObject[],
  warnings : ErrorObject[]
}

function filterErrors(allErrors: null | undefined | ErrorObject[], validationMode : OgcValidationMode): OgcValidationReport{
  let isValid = false;
  let errors: ErrorObject[] = [];
  let warnings : ErrorObject[] = [];
  const errorsToExtract = '#/definitions/additional-rules/';

  if(allErrors && validationMode === OgcValidationMode.Strict){
    //No filtering: all errors are considered as errors. No warnings.
    errors = allErrors;

  } else if(allErrors && validationMode === OgcValidationMode.Normal) {
    //Treat errors that  match additionalRules as warnings
    const partitionedErrors = partitionErrorsBySchemaPath(allErrors, errorsToExtract);
    errors = partitionedErrors.kept;
    warnings = partitionedErrors.removed;

  }else if(allErrors && validationMode === OgcValidationMode.Soft){
    //Only keep errors that do not match additionalRules
    const partitionedErrors = partitionErrorsBySchemaPath(allErrors, errorsToExtract);
    errors = partitionedErrors.kept;

  }else{
    if(allErrors){
      errors = allErrors;
    }
  }

  if(errors === null || errors === undefined || errors?.length === 0){
    isValid = true;
  }

  console.log("Is Valid:",isValid);
  console.log('Errors :', errors);
  console.log('Warnings :', warnings);
  return { isValid: isValid,errors: errors, warnings: warnings};
}

export async function ogcValidator(data: unknown): Promise<ValidationReport> {

  await schemasReady;
  await mainSchemaReady;
  const { ogcValidationMode } = await getConfig();

  const validate = ajv.compile(mainSchema);
  validate(data);

  console.log("Validation Mode:",ogcValidationMode);
  const validationReport = filterErrors(validate.errors,ogcValidationMode);

  const result = { valid: validationReport.isValid, schema: `${process.env.PUBLIC_URL}/schemas/eof-eos-schema.json`, errors: validationReport.errors ?? null, warnings : validationReport.warnings};
  return { valid:validationReport.isValid, results: [result]};
}
