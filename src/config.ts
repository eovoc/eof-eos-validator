interface AppConfig {
  converterUrl: string;
  ogcValidationSchema: string;
  // StrictValidation property, when false: additionalRules error are moved to warnings.
  strictValidation: boolean;
}

const configReady: Promise<AppConfig> = fetch(`${process.env.PUBLIC_URL}/config.json`)
  .then((res) => {
    if (!res.ok) throw new Error(`Failed to load config.json: ${res.status}`);
    return res.json();
  });

export function getConfig(): Promise<AppConfig> {
  return configReady;
}
