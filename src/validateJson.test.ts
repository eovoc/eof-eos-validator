import { validateJson } from "./validateJson";

const schema = {
  type: "object",
  properties: {
    name: { type: "string" },
    age: { type: "integer", minimum: 0 },
  },
  required: ["name"],
  additionalProperties: false,
};

test("returns valid for conforming data", async () => {
  const result = await validateJson({ name: "Alice", age: 30 }, schema);
  expect(result.valid).toBe(true);
  expect(result.errors).toBeNull();
});

test("returns errors when required property is missing", async () => {
  const result = await validateJson({ age: 25 }, schema);
  expect(result.valid).toBe(false);
  expect(result.errors).not.toBeNull();
  expect(result.errors![0].message).toMatch(/must have required property/);
});

test("returns errors for wrong type", async () => {
  const result = await validateJson({ name: 42 }, schema);
  expect(result.valid).toBe(false);
  expect(result.errors![0].instancePath).toBe("/name");
});

test("returns errors for additional properties", async () => {
  const result = await validateJson({ name: "Bob", unknown: true }, schema);
  expect(result.valid).toBe(false);
});

test("returns errors for constraint violation", async () => {
  const result = await validateJson({ name: "Eve", age: -1 }, schema);
  expect(result.valid).toBe(false);
  expect(result.errors![0].instancePath).toBe("/age");
});
