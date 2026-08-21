import { ErrorObject } from "ajv";

export interface ValidationResult {
    valid: boolean;
    schema: string;
    errors: ErrorObject[] | null;
    warnings?: ErrorObject[] | null | undefined;
}

export interface ValidationReport {
    valid: boolean;
    results : ValidationResult[]
}