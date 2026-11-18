
export function prettyPrint(content: any) : string {
    return JSON.stringify(content, null, 2);
}

export async function fetchJson(url: string): Promise<unknown> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
    }
    return res.json();
}

// data:application/json;base64,<data> URL of a JSON value. The JSON is encoded to UTF-8
// first: btoa only accepts Latin-1 characters. Base64 also keeps the URL free of the
// characters that would break a markdown link, such as ")" or spaces.
export function toJsonDataUrl(value: unknown): string {
    const bytes = new TextEncoder().encode(JSON.stringify(value, null, 2));
    let binary = "";
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return `data:application/json;base64,${btoa(binary)}`;
}