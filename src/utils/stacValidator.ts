import { ErrorObject } from "ajv";
import validate, { StacValidationError, StacValidationReport } from "stac-node-validator";
import { ValidationReport,ValidationResult } from "./ValidationResult";

function toErrorObject(error: StacValidationError): ErrorObject {
  return {
    keyword: (error.keyword as string) ?? "",
    instancePath: error.instancePath ?? "",
    schemaPath: (error.schemaPath as string) ?? "",
    params: (error.params as object) ?? {},
    message: error.message,
  } as ErrorObject;
}

function collectResults(report: StacValidationReport): ValidationResult[] {
  console.log("STAC Validation report: ",report);

  const results = [];

  results.push({schema: 'core', valid: report.results.core!.length < 1, errors : report.results.core!.map(toErrorObject)});
  results.push({schema: 'custom', valid: report.results.custom!.length < 1, errors : report.results.custom!.map(toErrorObject)});

  for (const [extension, errors] of Object.entries(report.results.extensions ?? {})) {
    results.push({schema: extension, valid: errors.length < 1, errors: errors.map(toErrorObject)});
  }

  if (report.children.length > 0) {
    results.push(...report.children.flatMap(collectResults));
  }

  console.log('results mapping:',results);
  return results;
}

export async function stacValidator(data: unknown): Promise<ValidationReport> {
  try {
    // stac-node-validator treats a string input as a file path/URL to fetch,
    // not as JSON text, so parse it ourselves first.
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const stacReport = await validate(parsed, { strict: false });
    const valid = stacReport.valid === true;
    const results = collectResults(stacReport);
    return { valid, results:results };
  } catch (error) {
    const errors = [toErrorObject({ message: error instanceof Error ? error.message : String(error) })];
    return {
      valid: false,
      results: [{schema: "Internal error - validation could not be executed.", valid : false, errors}]
    };
  }
}
