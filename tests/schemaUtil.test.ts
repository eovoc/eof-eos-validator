import { getConfig, OgcValidationMode } from "../src/config";
import { getValidationSchemaPath } from "../src/utils/schemaUtil";

// getConfig() normally fetches public/config.json; mock it so each test can
// choose the ogcValidationMode. OgcValidationMode itself is kept real.
jest.mock("../src/config", () => ({
  ...jest.requireActual("../src/config"),
  getConfig: jest.fn(),
}));

const mockedGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const BASE = process.env.PUBLIC_URL ?? "";

function mockConfig(ogcValidationMode: OgcValidationMode) {
  mockedGetConfig.mockResolvedValue({
    converterUrl: "http://converter",
    ogcValidationSchema: "schemas/eof-eos-schema.json",
    ogcStrictValidationSchema: "schemas/eof-eos-schema-strict.json",
    ogcSoftValidationSchema: "schemas/eof-eos-schema-soft.json",
    ogcValidationMode,
  });
}

describe("getValidationSchemaPath", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockedGetConfig.mockReset();
  });

  it("returns the strict schema in STRICT mode", async () => {
    mockConfig(OgcValidationMode.Strict);
    await expect(getValidationSchemaPath()).resolves.toBe(`${BASE}/schemas/eof-eos-schema-strict.json`);
  });

  it("returns the normal schema in NORMAL mode", async () => {
    mockConfig(OgcValidationMode.Normal);
    await expect(getValidationSchemaPath()).resolves.toBe(`${BASE}/schemas/eof-eos-schema.json`);
  });

  it("returns the soft schema in SOFT mode", async () => {
    mockConfig(OgcValidationMode.Soft);
    await expect(getValidationSchemaPath()).resolves.toBe(`${BASE}/schemas/eof-eos-schema-soft.json`);
  });

  it("falls back to the normal schema for an invalid mode", async () => {
    mockConfig("bogus" as OgcValidationMode);
    await expect(getValidationSchemaPath()).resolves.toBe(`${BASE}/schemas/eof-eos-schema.json`);
  });

  it("propagates errors when the config cannot be loaded", async () => {
    mockedGetConfig.mockRejectedValue(new Error("Failed to load config.json: 404"));
    await expect(getValidationSchemaPath()).rejects.toThrow("Failed to load config.json: 404");
  });
});
