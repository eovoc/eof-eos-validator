// ogcValidationMode property
// - 'strict': additional rules processed as errors
// - 'normal': additional rules processed as warnings
// - 'soft': additional rules ignored.
export enum OgcValidationMode {
  Strict = 'strict',
  Normal = 'normal',
  Soft = 'soft',
}

interface AppConfig {
  //converterUrl: url of the stac converter service
  converterUrl: string;
  // ogcValidationSchema property, name of the jsonschema used for ogc valdiation..
  ogcValidationSchema: string;
  // StrictValidation property, when false: additionalRules error are moved to warnings.
  strictValidation: boolean;
  ogcValidationMode: OgcValidationMode;
}

const configReady: Promise<AppConfig> = fetch(`${process.env.PUBLIC_URL}/config.json`)
  .then((res) => {
    if (!res.ok) throw new Error(`Failed to load config.json: ${res.status}`);
    return res.json();
  });

export function getConfig(): Promise<AppConfig> {
  return configReady;
}
