import fs from "fs";
import path from "path";
import schema from "../public/schemas/eof-eos-schema.json";
import baseFixture from "./__fixtures__/ogc/valid-eof-eos-thesaurus-example.json";

// Same real-schema, no-mocking setup as ogcValidator.test.ts: fetch() is
// pointed at the on-disk public/ folder so ogcValidator loads the genuine
// eof-eos-schema.json (and its mdj.json/dqc.json refs) unmocked.
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

const thesaurus = schema.definitions.thesaurus as Record<string, { enum: string[] }>;

type PathSegment = string | number;

// Each entry pinpoints where a thesaurus-backed enum lives in the fixture
// above, and which `#/definitions/thesaurus/<key>` it must obey.
const ENUM_FIELDS: { name: string; path: PathSegment[]; thesaurusKey: string }[] = [
  { name: "properties.status", path: ["properties", "status"], thesaurusKey: "status-types" },
  { name: "platform.orbitType", path: ["properties", "acquisitionInformation", 0, "platform", "orbitType"], thesaurusKey: "orbit-types" },
  { name: "instrument.sensorType", path: ["properties", "acquisitionInformation", 0, "instrument", "sensorType"], thesaurusKey: "sensor-types" },
  { name: "acquisitionParameters.acquisitionType", path: ["properties", "acquisitionInformation", 0, "acquisitionParameters", 0, "acquisitionType"], thesaurusKey: "acquisition-types" },
  { name: "acquisitionParameters.antennaLookDirection", path: ["properties", "acquisitionInformation", 0, "acquisitionParameters", 0, "antennaLookDirection"], thesaurusKey: "antenna-look-direction-types" },
  { name: "acquisitionParameters.acquisitionStation", path: ["properties", "acquisitionInformation", 0, "acquisitionParameters", 0, "acquisitionStation"], thesaurusKey: "acquisition-station-types" },
  { name: "acquisitionParameters.polarisationMode", path: ["properties", "acquisitionInformation", 0, "acquisitionParameters", 0, "polarisationMode"], thesaurusKey: "polarisation-mode-types" },
  { name: "acquisitionParameters.polarisationChannels", path: ["properties", "acquisitionInformation", 0, "acquisitionParameters", 0, "polarisationChannels"], thesaurusKey: "polarisation-channels-types" },
  { name: "acquisitionParameters.measurementType", path: ["properties", "acquisitionInformation", 0, "acquisitionParameters", 0, "measurementType"], thesaurusKey: "measurement-types" },
  { name: "acquisitionParameters.orbitDirection", path: ["properties", "acquisitionInformation", 0, "acquisitionParameters", 0, "orbitDirection"], thesaurusKey: "orbit-direction-types" },
  { name: "waveLengths.spectralRange", path: ["properties", "acquisitionInformation", 0, "acquisitionParameters", 0, "waveLengths", 0, "spectralRange"], thesaurusKey: "spectral-range-types" },
  { name: "productInformation.processingLevel", path: ["properties", "productInformation", "processingLevel"], thesaurusKey: "processing-level-types" },
  { name: "productInformation.processingMode", path: ["properties", "productInformation", "processingMode"], thesaurusKey: "processing-mode-types" },
  { name: "productInformation.productContentsType", path: ["properties", "productInformation", "productContentsType"], thesaurusKey: "product-content-types" },
  { name: "productInformation.timeliness", path: ["properties", "productInformation", "timeliness"], thesaurusKey: "timeliness-types" },
  { name: "qualityInformation.qualityStatus", path: ["properties", "productInformation", "qualityInformation", "qualityStatus"], thesaurusKey: "quality-status-types" },
  { name: "qualityInformation.qualityDegradationTag", path: ["properties", "productInformation", "qualityInformation", "qualityDegradationTag"], thesaurusKey: "quality-degradation-tag-types" },
  { name: "qualityInformation.qualityDegradationQuotationMode", path: ["properties", "productInformation", "qualityInformation", "qualityDegradationQuotationMode"], thesaurusKey: "quality-degradation-quotation-mode-types" },
  { name: "links.measurements[0].type", path: ["properties", "links", "measurements", 0, "type"], thesaurusKey: "link-types" },
  { name: "links.measurements[0].category", path: ["properties", "links", "measurements", 0, "category"], thesaurusKey: "category-types" },
];

const INVALID_VALUE = "NOT_A_REAL_THESAURUS_VALUE";

function cloneFixture(): any {
  return JSON.parse(JSON.stringify(baseFixture));
}

function setAtPath(obj: any, segments: PathSegment[], value: unknown): void {
  let cursor = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    cursor = cursor[segments[i]];
  }
  cursor[segments[segments.length - 1]] = value;
}

// Every {field, value} pair across all thesaurus enums, generated from the
// schema itself so this stays in sync as enums are added to/removed from it.
const VALID_VALUE_CASES = ENUM_FIELDS.flatMap((field) =>
  thesaurus[field.thesaurusKey].enum.map((value) => ({ ...field, value }))
);

describe("ogcValidator enforces thesaurus enum constraints (real EOF-EOS schema, no mocking)", () => {
  it("accepts the fully populated baseline fixture as-is", async () => {
    const result = await ogcValidator(cloneFixture());

    expect(result.results[0].errors).toBeNull();
    expect(result.valid).toBe(true);
  });

  test.each(ENUM_FIELDS)("rejects an out-of-thesaurus value for $name", async ({ path: fieldPath, thesaurusKey }) => {
    expect(thesaurus[thesaurusKey].enum).not.toContain(INVALID_VALUE);

    const doc = cloneFixture();
    setAtPath(doc, fieldPath, INVALID_VALUE);

    const result = await ogcValidator(doc);

    expect(result.valid).toBe(false);
    expect(
      result.results[0].errors?.some(
        (e) => e.keyword === "enum" && e.schemaPath === `#/definitions/thesaurus/${thesaurusKey}/enum`
      )
    ).toBe(true);
  });

  test.each(VALID_VALUE_CASES)('accepts thesaurus value "$value" for $name', async ({ path: fieldPath, value }) => {
    const doc = cloneFixture();
    setAtPath(doc, fieldPath, value);

    const result = await ogcValidator(doc);

    expect(result.results[0].errors).toBeNull();
    expect(result.valid).toBe(true);
  });
});
