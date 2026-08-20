import {getConfig} from "../config";


export interface ConversionResult {
    result: string | null;
    error: Error | null;
}

export async function convert(data: unknown): Promise<ConversionResult> {

    let result : string | null = null;
    let error : Error|null = null;

    const { converterUrl } = await getConfig();
    const res = await fetch(converterUrl, {
        method: "POST",
        headers: { "Content-Type": "application/geo+json" },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        error = Error(`Server responded with ${res.status} ${res.statusText}`);
    }else{
        const text = await res.text();
        let pretty: string;
        try {
            pretty = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
            pretty = text;
        }
        result = pretty;
    }

    return {"result": result, "error": error};
}