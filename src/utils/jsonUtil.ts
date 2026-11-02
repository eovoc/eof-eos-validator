
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
