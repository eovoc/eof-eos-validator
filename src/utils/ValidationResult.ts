import { ErrorObject } from "ajv";

export interface ValidationResult {
    valid: boolean;
    errors: ErrorObject[] | null;
}