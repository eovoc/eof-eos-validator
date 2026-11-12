import Ajv2019, {ErrorObject} from "ajv/dist/2019";
import addFormats from "ajv-formats";
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json";
import {partitionErrorsBySchemaPath, ValidationReport} from "../types/ValidationResult";
import {getConfig, OgcValidationMode} from "../config";
import {enforcePropertyAsMandatory, getValidationSchemaPath, JsonSchema, STATIC_SCHEMAS} from "../utils/schemaUtil";

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

//Function used to filter erros based on validation mode. The goal is to show additional-rules errors as warnings or not show those errors at all.
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

function buildValidationReport(errors: null | undefined | ErrorObject[]){

  let isValid = false;
  if(errors === null || errors === undefined || errors?.length === 0){
    isValid = true;
    errors = [];
  }

  return { isValid: isValid,errors: errors, warnings: []};
}

//Build the schema used for validation when user-defined mandatory properties are set: the main schema
//with those properties added as required. Returns null when there is no mandatory property.
export async function buildCustomSchema(mandatoryProperties: string[] = []): Promise<JsonSchema | null> {
  return mandatoryProperties.length > 0 ? enforcePropertyAsMandatory(mandatoryProperties) : null;
}

export async function ogcValidator(data: unknown, mandatoryProperties: string[] = []): Promise<ValidationReport> {

  await schemasReady;
  await mainSchemaReady;
  const { ogcValidationMode } = await getConfig();

  //Use a schema with the user-defined mandatory properties added as required, if any.
  const customSchema = await buildCustomSchema(mandatoryProperties);
  console.log("Mandatory properties:", mandatoryProperties);

  const validate = ajv.compile(customSchema ?? mainSchema);
  validate(data);
  //The custom schema is rebuilt on each validation: drop it from the ajv cache.
  if (customSchema) ajv.removeSchema(customSchema);

  console.log("Validation Mode:",ogcValidationMode);
  //const validationReport = filterErrors(validate.errors,ogcValidationMode);
  const validationReport = buildValidationReport(validate.errors);

  const result = { valid: validationReport.isValid, schema: await getValidationSchemaPath(), errors: validationReport.errors ?? null, warnings : validationReport.warnings};
  return { valid:validationReport.isValid, results: [result]};
}
