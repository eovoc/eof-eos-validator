import fs from "fs";
import path from "path";
import validExample from "./__fixtures__/ogc/valid-eof-eos-example.json";

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

let ogcValidator: typeof import("../src/services/ogcValidator")["ogcValidator"];

beforeAll(async () => {
  (global as any).fetch = fileFetch(path.join(__dirname, "..", "public"));
  ({ ogcValidator } = await import("../src/services/ogcValidator"));
});

describe("ogcValidator tests for additional properties", () => {

  //ADDITIONAL Properties - Platform
  it("Platform forbid additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.acquisitionInformation[0].platform.newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //newProperty should be forbidden.
    expect(result.valid).toBe(false);
    expect(
        result.results[0].errors?.some(
            (e) => e.keyword === "additionalProperties" && e.params?.additionalProperty === "newProperty"
        )
    ).toBe(true);
  });

  //ADDITIONAL Properties - Instrument
  it("Instrument forbid additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.acquisitionInformation[0].instrument.newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //newProperty should be forbidden.
    expect(result.valid).toBe(false);
    expect(
        result.results[0].errors?.some(
            (e) => e.keyword === "additionalProperties" && e.params?.additionalProperty === "newProperty"
        )
    ).toBe(true);
  });

  //ADDITIONAL Properties - AcquisitionAngles
  it("AcquisitionAngles forbid additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.acquisitionInformation[0].acquisitionParameters[0].acquisitionAngles.newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //newProperty should be forbidden.
    expect(result.valid).toBe(false);
    expect(
        result.results[0].errors?.some(
            (e) => e.keyword === "additionalProperties" && e.params?.additionalProperty === "newProperty"
        )
    ).toBe(true);
  });


  //ADDITIONAL Properties - WavelengthInformation
  it("WavelengthInformation forbid additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.acquisitionInformation[0].acquisitionParameters[0].waveLengths[0].newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //newProperty should be forbidden.
    expect(result.valid).toBe(false);
    expect(
        result.results[0].errors?.some(
            (e) => e.keyword === "additionalProperties" && e.params?.additionalProperty === "newProperty"
        )
    ).toBe(true);
  });

});
