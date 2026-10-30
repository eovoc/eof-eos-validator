import {Settings, validateSettings} from "../types/Settings";

const BASE = process.env.PUBLIC_URL ?? "";

export async function getDefaultSettings(): Promise<Settings>{

    const settingsFilePath = BASE+"/settings.json"

    const res = await fetch(settingsFilePath);
    if (!res.ok) throw new Error(`Failed to load settings.json: ${res.status}`);

    const settings: unknown = await res.json();
    const validationError = validateSettings(settings);
    if (validationError) throw new Error(`Invalid settings.json: ${validationError}`);

    return settings as Settings;
}
