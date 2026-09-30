import {getConfig, OgcValidationMode} from "../config";

// Schema files are served from /schemas/ as static assets
const BASE = process.env.PUBLIC_URL ?? "";

export const STATIC_SCHEMAS = [
    `${BASE}/schemas/mdj.json`,
    `${BASE}/schemas/dqc.json`,
];

// Select schema based on ogcValidationMode
// STRICT -> ogcStrictValidationSchema
// NORMAL -> ogcValidationSchema
// SOFT -> ogcSoftValidationSchema
//Schema locations are defined in public/config.json
export async function getValidationSchemaPath(): Promise<string> {
    const { ogcValidationSchema, ogcStrictValidationSchema, ogcSoftValidationSchema, ogcValidationMode } = await getConfig();

    let schemaPath;
    switch (ogcValidationMode) {
        case OgcValidationMode.Strict:
            console.log("Loading STRICT Schema");
            schemaPath = ogcStrictValidationSchema;
            break;
        case OgcValidationMode.Normal:
            console.log("Loading NORMAL Schema");
            schemaPath = ogcValidationSchema;
            break;
        case OgcValidationMode.Soft:
            console.log("Loading SOFT Schema");
            schemaPath = ogcSoftValidationSchema;
            break;
        default:
            console.log(`Invalid ogcValidationMode: ${ogcValidationMode}, loaing schema default to NORMAL schema.`);
            schemaPath = ogcValidationSchema;
    }
    return `${BASE}/${schemaPath}`;
}
