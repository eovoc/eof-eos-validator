export type Settings = {
  /** Property names that must be enforced as required in the validation schema. */
  requiredProperties: string[];
  optionalProperties: string[];
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/** Returns an error message if the value is not a valid Settings object, or null if it is. */
export function validateSettings(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "expected a JSON object";
  }
  const obj = value as Record<string, unknown>;
  for (const key of ["requiredProperties", "optionalProperties"]) {
    if (!(key in obj)) return `missing "${key}"`;
    if (!isStringArray(obj[key])) return `"${key}" must be an array of strings`;
  }
  return null;
}
