import fs from "fs";
import path from "path";
import validExample from "./__fixtures__/ogc/valid-eof-eos-example.json";
import invalidExample from "./__fixtures__/ogc/invalid-eof-eos-example.json";

// ogcValidator fetches its schemas (eof-eos-schema.json, plus the referenced
// mdj.json/dqc.json) from `${PUBLIC_URL}/schemas/...` at module load time, the
// same way the built app fetches them as static assets from public/. In this
// test environment there's no dev server, so fetch() is pointed at the real
// public/ folder on disk instead — the schema content and ajv validation are
// still the genuine, unmocked ones, only the transport differs.
jest.setTimeout(30000);

function fileFetch(publicDir: string) {
  return async (input: unknown) => {
    const url = typeof input === "string" ? input : String(input);
    const filePath = path.join(publicDir, url.replace(/^\/+/, ""));
    try {
      const contents = await fs.promises.readFile(filePath, "utf8");
      return { ok: true, status: 200, statusText: "OK", json: async () => JSON.parse(contents) };
    } catch {
      return { ok: false, status: 404, statusText: "Not Found", json: async () => { throw new Error("no body"); } };
    }
  };
}

let ogcValidator: typeof import("../src/utils/ogcValidator")["ogcValidator"];

beforeAll(async () => {
  (global as any).fetch = fileFetch(path.join(__dirname, "..", "public"));
  ({ ogcValidator } = await import("../src/utils/ogcValidator"));
});

describe("ogcValidator (real EOF-EOS schema, no mocking)", () => {
  it("validates a real EOF-EOS example as valid", async () => {
    const result = await ogcValidator(validExample);

    expect(result.valid).toBe(true);
    expect(result.results[0].errors).toBeNull();
  });

  it("flags an example missing a required field (id) as invalid", async () => {
    const result = await ogcValidator(invalidExample);

    expect(result.valid).toBe(false);
    expect(result.results[0].errors?.some((e) => e.params?.missingProperty === "id")).toBe(true);
  });
});
