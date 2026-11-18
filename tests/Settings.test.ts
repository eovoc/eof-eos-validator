import {validate} from "../src/types/Settings";

describe("validate", () => {
  it("accepts a valid settings object", () => {
    expect( ()=>
        validate({requiredProperties: ["id"], optionalProperties: ["title"]})
    ).not.toBeNull();
  });

  it("accepts empty property lists", () => {
    expect( () =>
        validate({requiredProperties: [], optionalProperties: []})
    ).not.toBeNull();
  });

  it("reject extra keys", () => {
    expect( ()=>
        validate({requiredProperties: [], optionalProperties: [], extra: 1})
    ).toThrow(/additional properties/);
  });

  it.each([
    ["null", null],
    ["an array", []],
    ["a string", "settings"],
    ["a number", 42],
  ])("rejects %s", (_, value) => {
    expect( () =>
        validate(value)
    ).toThrow(/data must be object/);
  });

  it("rejects a missing requiredProperties", () => {
    expect( () =>
        validate({optionalProperties: []})
    ).toThrow(/requiredProperties/);
  });

  it("rejects a missing optionalProperties", () => {
    expect( () =>
        validate({requiredProperties: []})
    ).toThrow(/optionalProperties/);
  });

  it.each([
    ["a string", "id"],
    ["null", null],
    ["an object", {id: true}],
  ])("rejects requiredProperties that is %s", (_, value) => {
    expect(
        () => validate({requiredProperties: value, optionalProperties: []})
    ).toThrow(/requiredProperties must be array/);
  });

  it.each([
    ["an array with non-strings", ["id", 1]],
  ])("rejects requiredProperties that is not an array of strings", (_, value) => {
    expect(
        () => validate({requiredProperties: value, optionalProperties: []})
    ).toThrow(/requiredProperties\/1 must be string/);
  });

  it.each([
      ["a string", "id"],
      ["null", null],
      ["an object", {id: true}],])
  ("rejects optionalProperties that is %s", (_, value) => {
    expect(
        () => validate({requiredProperties: [], optionalProperties: value})
    ).toThrow(/optionalProperties must be array/);
  });

  it.each([
    ["an array with non-strings", ["id", 1]],
  ])("rejects optionalProperties that is not an array of strings", (_, value) => {
    expect(
        () => validate({requiredProperties: [], optionalProperties: value})
    ).toThrow(/optionalProperties\/1 must be string/);
  });
});
