// Short labels for the schemas listed in a STAC validation report, as shown by
// STAC Browser: "Item 1.0.0" for the core schema, "sar v1.3.0 Extension" for
// https://stac-extensions.github.io/sar/v1.3.0/schema.json.

export interface SchemaLabel {
  name: string;
  version: string | null;
  extension: boolean;
}

// stac-node-validator reports the GeoJSON type of an Item ("Feature").
const CORE_NAMES: Record<string, string> = {
  Feature: "Item",
  Collection: "Collection",
  Catalog: "Catalog",
};

const VERSION_SEGMENT = /^v\d+\.\d+\.\d+/;

export function coreSchemaLabel(type: string | null, stacVersion: string | null): SchemaLabel {
  const name = type ? CORE_NAMES[type] ?? type : "STAC";
  return { name, version: stacVersion, extension: false };
}

// <host>/<name...>/v<version>/schema.json
// - stac-extensions.github.io and other *.github.io hosts: only <name> is kept;
// - any other host: <host>/<name>, e.g. "eof-eos.io.esa.int/stac-extension".
// A URL that does not follow this pattern is shown as is, without version.
export function extensionSchemaLabel(schemaUrl: string): SchemaLabel {
  let url: URL;
  try {
    url = new URL(schemaUrl);
  } catch {
    return { name: schemaUrl, version: null, extension: true };
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const versionIndex = segments.findIndex((segment) => VERSION_SEGMENT.test(segment));
  if (versionIndex < 0) {
    return { name: schemaUrl, version: null, extension: true };
  }

  const nameParts = segments.slice(0, versionIndex);
  const name = url.hostname.endsWith(".github.io") && nameParts.length > 0
    ? nameParts.join("/")
    : [url.hostname, ...nameParts].join("/");

  return { name, version: segments[versionIndex], extension: true };
}

export function schemaLabel(schema: string, type: string | null, stacVersion: string | null): SchemaLabel {
  if (schema === "core") {
    return coreSchemaLabel(type, stacVersion);
  }
  if (/^https?:\/\//.test(schema)) {
    return extensionSchemaLabel(schema);
  }
  // e.g. "Internal error - validation could not be executed."
  return { name: schema, version: null, extension: false };
}
