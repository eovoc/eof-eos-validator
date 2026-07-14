const BASE = process.env.PUBLIC_URL ?? "";
export const THESAURUS_DIR = `${BASE}/schemas/thesaurus`;

// scripts/convert.sh writes manifest.json listing every generated schema
// file, since a static SPA can't list a directory's contents on its own.
export async function loadThesaurusSchemaFiles(): Promise<string[]> {
  try {
    const res = await fetch(`${THESAURUS_DIR}/manifest.json`);
    if (!res.ok) return [];
    return await res.json() as string[];
  } catch {
    return [];
  }
}
