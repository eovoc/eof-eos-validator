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

  //ADDITIONAL Properties - root
  it("root properties allows additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.newProperty = modifiedExample.properties.status;

    const result = await ogcValidator(modifiedExample);

    //properties.newProperty should be allowed.
    console.log(result);
    expect(result.valid).toBe(true);
  });

  //ADDITIONAL Properties - ProductInformation
  it("ProductInformation allows additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.productInformation.newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //properties.newProperty should be allowed.
    expect(result.valid).toBe(true);
  });

  //ADDITIONAL Properties - Links
  it("Links allows additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.links.newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //properties.newProperty should be allowed.
    expect(result.valid).toBe(true);
  });

  //ADDITIONAL Properties - Link
  it("Link allows additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.links.measurements.newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //properties.newProperty should be allowed.
    expect(result.valid).toBe(true);
  });

  //ADDITIONAL Properties - AcquisitionInformation
  it("AcquisitionInformation allows additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.acquisitionInformation[0].newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //properties.newProperty should be allowed.
    expect(result.valid).toBe(true);
  });

  //ADDITIONAL Properties - AcquisitionParameters
  it("AcquisitionParameters allows additional properties", async () => {
    const modifiedExample = JSON.parse(JSON.stringify(validExample));
    modifiedExample.properties.acquisitionInformation[0].acquisitionParameters[0].newProperty = "new value";

    const result = await ogcValidator(modifiedExample);

    //properties.newProperty should be allowsed.
    expect(result.valid).toBe(true);
  });

});
