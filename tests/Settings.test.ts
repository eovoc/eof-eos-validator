import {validateSettings} from "../src/types/Settings";

describe("validateSettings", () => {
  it("accepts a valid settings object", () => {
    expect(validateSettings({requiredProperties: ["id"], optionalProperties: ["title"]})).toBeNull();
  });

  it("accepts empty property lists", () => {
    expect(validateSettings({requiredProperties: [], optionalProperties: []})).toBeNull();
  });

  it("accepts extra keys", () => {
    expect(validateSettings({requiredProperties: [], optionalProperties: [], extra: 1})).toBeNull();
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "settings"],
    ["a number", 42],
  ])("rejects %s", (_, value) => {
    expect(validateSettings(value)).toBe("expected a JSON object");
  });

  it("rejects a missing requiredProperties", () => {
    expect(validateSettings({optionalProperties: []})).toBe('missing "requiredProperties"');
  });

  it("rejects a missing optionalProperties", () => {
    expect(validateSettings({requiredProperties: []})).toBe('missing "optionalProperties"');
  });

  it.each([
    ["a string", "id"],
    ["null", null],
    ["an object", {id: true}],
    ["an array with non-strings", ["id", 1]],
  ])("rejects requiredProperties that is %s", (_, value) => {
    expect(validateSettings({requiredProperties: value, optionalProperties: []}))
      .toBe('"requiredProperties" must be an array of strings');
  });

  it("rejects optionalProperties that is not an array of strings", () => {
    expect(validateSettings({requiredProperties: [], optionalProperties: [null]}))
      .toBe('"optionalProperties" must be an array of strings');
  });
});
