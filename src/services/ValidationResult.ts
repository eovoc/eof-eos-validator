import { ErrorObject } from "ajv";

export interface ValidationResult {
    valid: boolean;
    schema: string;
    errors: ErrorObject[] | null;
    warnings?: ErrorObject[] | undefined;
}

export interface ValidationReport {
    valid: boolean;
    results : ValidationResult[]
}