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
            console.log(`Invalid ogcValidationMode: ${ogcValidationMode}, loading schema default to NORMAL schema.`);
            schemaPath = ogcValidationSchema;
    }
    return `${BASE}/${schemaPath}`;
}
export type JsonSchema = Record<string, any>;

export async function  loadSchema(): Promise<JsonSchema>{
    const VALIDATION_SCHEMA = await getValidationSchemaPath();
    const res = await fetch(VALIDATION_SCHEMA);
    if (!res.ok) throw new Error(`Failed to load validation schema: ${res.status} ${res.statusText}`);
    return res.json();
};


export async function enforcePropertyAsMandatory(mandatoryProperties: string[]) : Promise<JsonSchema>{

    //Load schema
    const currentSchema = await loadSchema();
    const mandatory = new Set(mandatoryProperties);

    //For each property, add it in the required section of the object containing the property.
    //Walks the whole schema tree (definitions, allOf/anyOf/oneOf, items, nested properties...).
    const visit = (node: unknown): void => {
        if (Array.isArray(node)) {
            node.forEach(visit);
            return;
        }
        if (node === null || typeof node !== "object") return;

        const schemaNode = node as JsonSchema;
        const properties = schemaNode.properties;
        if (properties && typeof properties === "object" && !Array.isArray(properties)) {
            const toAdd = Object.keys(properties).filter((name) => mandatory.has(name));
            if (toAdd.length > 0) {
                const required: string[] = Array.isArray(schemaNode.required) ? schemaNode.required : [];
                schemaNode.required = Array.from(new Set([...required, ...toAdd]));
            }
        }

        Object.values(schemaNode).forEach(visit);
    };

    visit(currentSchema);
    return currentSchema;
}
