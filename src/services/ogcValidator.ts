import Ajv2019, {ErrorObject} from "ajv/dist/2019";
import addFormats from "ajv-formats";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";
import {partitionErrorsBySchemaPath, ValidationReport} from "./ValidationResult";
import {getConfig, OgcValidationMode} from "../config";
import {getValidationSchemaPath, STATIC_SCHEMAS} from "../utils/schemaUtil";

const ajv = new Ajv2019({ allErrors: true, validateSchema: true, strict: true });
addFormats(ajv);

// Ajv2019 applies the 2019-09 vocabulary (incl. unevaluatedProperties) to every schema,
// but only knows the 2019-09 meta-schema: register draft-07 so "$schema": draft-07 schemas resolve.
ajv.addMetaSchema(draft7MetaSchema);

//Add schemas required by the main schema
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

//Load the main schema.
let mainSchema: any;
const mainSchemaReady: Promise<void> = (async () => {
  const { ogcValidationMode } = await getConfig();
  const VALIDATION_SCHEMA = await getValidationSchemaPath();
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
    console.log("No filtering: all errors are considered as errors. No warnings.");
    errors = allErrors;

  } else if(allErrors && validationMode === OgcValidationMode.Normal) {
    console.log("Treat errors that  match additionalRules as warnings");
    const partitionedErrors = partitionErrorsBySchemaPath(allErrors, errorsToExtract);
    errors = partitionedErrors.kept;
    warnings = partitionedErrors.removed;

  }else if(allErrors && validationMode === OgcValidationMode.Soft){
    console.log("Only keep errors that do not match additionalRules");
    const partitionedErrors = partitionErrorsBySchemaPath(allErrors, errorsToExtract);
    errors = partitionedErrors.kept;

  }else{
    console.log("bypass");
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

  const result = { valid: validationReport.isValid, schema: await getValidationSchemaPath(), errors: validationReport.errors ?? null, warnings : validationReport.warnings};
  return { valid:validationReport.isValid, results: [result]};
}
