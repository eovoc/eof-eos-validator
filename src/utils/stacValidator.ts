import { ErrorObject } from "ajv";
import validate, { StacValidationError, StacValidationReport } from "stac-node-validator";
import { ValidationResult } from "./ValidationResult";

function toErrorObject(error: StacValidationError): ErrorObject {
  return {
    keyword: (error.keyword as string) ?? "",
    instancePath: error.instancePath ?? "",
    schemaPath: (error.schemaPath as string) ?? "",
    params: (error.params as object) ?? {},
    message: error.message,
  } as ErrorObject;
}

function collectErrors(report: StacValidationReport): ErrorObject[] {
  if (report.children.length > 0) {
    return report.children.flatMap(collectErrors);
  }

  const errors = [
    ...report.results.core,
    ...Object.values(report.results.extensions).flat(),
    ...report.results.custom,
  ].map(toErrorObject);

  if (errors.length === 0 && report.messages.length > 0) {
    errors.push(...report.messages.map((message) => toErrorObject({ message })));
  }

  return errors;
}

export async function stacValidator(data: unknown): Promise<ValidationResult> {
  try {
    // stac-node-validator treats a string input as a file path/URL to fetch,
    // not as JSON text, so parse it ourselves first.
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const report = await validate(parsed, { strict: true });
    const valid = report.valid === true;
    const errors = valid ? [] : collectErrors(report);
    return { valid, errors: errors.length > 0 ? errors : null };
  } catch (error) {
    return {
      valid: false,
      errors: [toErrorObject({ message: error instanceof Error ? error.message : String(error) })],
    };
  }
}
