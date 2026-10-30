import { getConfig, OgcValidationMode } from "../src/config";
import { enforcePropertyAsMandatory, getValidationSchemaPath, JsonSchema } from "../src/utils/schemaUtil";

// getConfig() normally fetches public/config.json; mock it so each test can
// choose the ogcValidationMode. OgcValidationMode itself is kept real.
jest.mock("../src/config", () => ({
  ...jest.requireActual("../src/config"),
  getConfig: jest.fn(),
}));

const mockedGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const BASE = process.env.PUBLIC_URL ?? "";

function buildSchema(): JsonSchema {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    $ref: "#/definitions/EarthObservation",
    definitions: {
      DataIdentification: {
        type: "object",
        properties: {
          doi: { type: "string" },
          title: { type: "string" },
          date: { type: "string" },
        },
        required: ["title", "date"],
      },
      ProcessingInformation: {
        type: "object",
        properties: {
          processorName: { type: "string" },
          processorVersion: { type: "string" },
        },
      },
      Instrument: {
        type: "object",
        properties: {
          platform: {
            type: "object",
            properties: {
              title: { type: "string" },
              serialIdentifier: { type: "string" },
            },
          },
        },
      },
      Links: {
        type: "array",
        items: {
          allOf: [
            {
              type: "object",
              properties: {
                href: { type: "string" },
                rel: { type: "string" },
              },
            },
          ],
        },
      },
    },
  };
}

function mockFetch(schema: JsonSchema, ok = true) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    statusText: ok ? "OK" : "Not Found",
    json: () => Promise.resolve(schema),
  }) as jest.Mock;
}

function mockConfig(ogcValidationMode: OgcValidationMode) {
  mockedGetConfig.mockResolvedValue({
    converterUrl: "http://converter",
    ogcValidationSchema: "schemas/eof-eos-schema.json",
    ogcStrictValidationSchema: "schemas/eof-eos-schema-strict.json",
    ogcSoftValidationSchema: "schemas/eof-eos-schema-soft.json",
    ogcValidationMode,
  });
}

describe("Modify schema to enforce mandatory properties.", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockedGetConfig.mockReset();
  });

  it("loads the schema matching the configured validation mode", async () => {
    mockConfig(OgcValidationMode.Normal);
    mockFetch(buildSchema());
    await enforcePropertyAsMandatory([]);
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/schemas/eof-eos-schema.json`);
  });

  it("creates a required array when the object has none", async () => {
    mockConfig(OgcValidationMode.Normal);
    mockFetch(buildSchema());
    const schema = await enforcePropertyAsMandatory(["processorName"]);
    expect(schema.definitions.ProcessingInformation.required).toEqual(["processorName"]);
  });

  it("appends to an existing required array without duplicates", async () => {
    mockConfig(OgcValidationMode.Normal);
    mockFetch(buildSchema());
    const schema = await enforcePropertyAsMandatory(["doi", "title"]);
    expect(schema.definitions.DataIdentification.required).toEqual(["title", "date", "doi"]);
  });

  it("applies to every object declaring the property, including nested ones", async () => {
    mockConfig(OgcValidationMode.Normal);
    mockFetch(buildSchema());
    const schema = await enforcePropertyAsMandatory(["title"]);
    expect(schema.definitions.DataIdentification.required).toEqual(["title", "date"]);
    expect(schema.definitions.Instrument.properties.platform.required).toEqual(["title"]);
  });

  it("walks through items and allOf", async () => {
    mockConfig(OgcValidationMode.Normal);
    mockFetch(buildSchema());
    const schema = await enforcePropertyAsMandatory(["href"]);
    expect(schema.definitions.Links.items.allOf[0].required).toEqual(["href"]);
  });

  it("leaves the schema untouched when no listed property exists", async () => {
    mockConfig(OgcValidationMode.Normal);
    mockFetch(buildSchema());
    const schema = await enforcePropertyAsMandatory(["unknownProperty"]);
    expect(schema).toEqual(buildSchema());
  });

  it("does not add required on the properties map itself", async () => {
    mockConfig(OgcValidationMode.Normal);
    mockFetch(buildSchema());
    const schema = await enforcePropertyAsMandatory(["doi"]);
    expect(schema.definitions.DataIdentification.properties.required).toBeUndefined();
  });

  it("propagates schema loading errors", async () => {
    mockConfig(OgcValidationMode.Normal);
    mockFetch(buildSchema(), false);
    await expect(enforcePropertyAsMandatory(["doi"])).rejects.toThrow(
      "Failed to load validation schema: 404 Not Found"
    );
  });
});
