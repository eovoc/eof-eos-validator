import {Settings, validate} from "../types/Settings";

const BASE = process.env.PUBLIC_URL ?? "";

export async function getDefaultSettings(): Promise<Settings>{

    const settingsFilePath = BASE+"/settings/default.json"

    const res = await fetch(settingsFilePath);
    if (!res.ok) throw new Error(`Failed to load settings.json: ${res.status}`);

    const settings: unknown = await res.json();
    try{
        validate(settings);
    }catch(validationError){
        throw new Error(`Invalid settings.json: ${validationError}`);
    }

    return settings as Settings;
}
