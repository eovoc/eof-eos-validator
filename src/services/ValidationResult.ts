import { ErrorObject } from "ajv";
import {OgcValidationMode} from "../config";

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

export type Partition = {
    kept: ErrorObject[];
    removed: ErrorObject[];
};

export function partitionErrorsBySchemaPath(
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