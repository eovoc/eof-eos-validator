import Ajv, { JSONSchemaType } from "ajv";

export type Settings = {
  name: string,
  version: string,
  /** Property names that must be enforced as required in the validation schema. */
  requiredProperties: string[];
  optionalProperties: string[];
};

const settingsSchema: JSONSchemaType<Settings> = {
  type: "object",
  properties: {
    name: {type: "string"},
    version: {type: "string"},
    requiredProperties: { type: "array", items: { type: "string", minLength: 0 }, uniqueItems: true },
    optionalProperties: { type: "array", items: { type: "string", minLength: 0 }, uniqueItems: true },
  },
  required: ["requiredProperties", "optionalProperties"],
  additionalProperties: false, // rejects extra keys
};

const ajv = new Ajv({ allErrors: true }); // report every error, not just the first
const validateSettings = ajv.compile(settingsSchema); // compile once, reuse

export function validate(input: unknown): Settings {
  if (!validateSettings(input)) {
    throw new Error(ajv.errorsText(validateSettings.errors));
  }
  return input; // narrowed to Settings by the type guard
}