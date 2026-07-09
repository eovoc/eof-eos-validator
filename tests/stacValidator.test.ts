import { stacValidator } from "../src/utils/stacValidator";
import validStacItem from "./__fixtures__/stac/valid-stac-item.json";
import invalidStacItem from "./__fixtures__/stac/invalid-stac-item.json";
import noVersionStacItem from "./__fixtures__/stac/no-version-stac-item.json";

// These tests hit the real stac-node-validator, which fetches the official
// STAC schemas over the network (https://schemas.stacspec.org). Allow extra
// time for that on top of jest's default 5s timeout.
jest.setTimeout(30000);

describe("stacValidator (real STAC schemas, no mocking)", () => {
  it("validates a well-formed STAC item as valid", async () => {
    const report = await stacValidator(validStacItem);

    expect(report.valid).toBe(true);
    const core = report.results.find((r) => r.schema === "core");
    expect(core).toEqual({ schema: "core", valid: true, errors: [] });
  });

  it("accepts the item passed as a JSON string, matching object input", async () => {
    const report = await stacValidator(JSON.stringify(validStacItem));

    expect(report.valid).toBe(true);
  });

  it("flags a STAC item missing required fields (assets) as invalid", async () => {
    const report = await stacValidator(invalidStacItem);

    expect(report.valid).toBe(false);
    const core = report.results.find((r) => r.schema === "core");
    expect(core?.valid).toBe(false);
    expect(core?.errors?.length).toBeGreaterThan(0);
    expect(core?.errors?.some((e) => e.message?.includes("assets"))).toBe(true);
  });

  it("reports core as invalid (not silently valid) when stac_version is missing and validation is skipped", async () => {
    const report = await stacValidator(noVersionStacItem);

    expect(report.valid).toBe(false);
    const core = report.results.find((r) => r.schema === "core");
    expect(core?.valid).toBe(false);
    expect(core?.errors?.some((e) => e.message === "No STAC version found")).toBe(true);
  });

  it("returns an internal error result for unparsable JSON string input", async () => {
    const report = await stacValidator("{not valid json");

    expect(report.valid).toBe(false);
    expect(report.results).toHaveLength(1);
    expect(report.results[0].schema).toBe("Internal error - validation could not be executed.");
  });
});
