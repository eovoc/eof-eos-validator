/**
 * skos-to-jsonschema.ts
 *
 * Convertit un thésaurus SKOS exporté en JSON-LD (un seul skos:ConceptScheme,
 * avec ses skos:Concept) en :
 *   1. un JSON Schema dont l'`enum` liste les prefLabel des concepts
 *   2. un contexte JSON-LD associant chaque label à l'URI complète du concept
 *
 * Usage :
 *   npx ts-node skos-to-jsonschema.ts <entree.jsonld> [dossier-sortie]
 *
 * Compilation manuelle :
 *   npx tsc skos-to-jsonschema.ts --target ES2020 --module commonjs
 *   node skos-to-jsonschema.js <entree.jsonld> [dossier-sortie]
 */

import * as fs from "fs";
import * as path from "path";

// ---------- Types minimaux pour le JSON-LD SKOS attendu en entrée ----------

interface JsonLdRef {
  uri: string;
}

type LangValue = string | { lang?: string; value: string };

interface SkosNode {
  uri: string;
  type: string | string[];
  prefLabel?: LangValue | LangValue[];
  "dct:title"?: LangValue;
  "skos:hasTopConcept"?: JsonLdRef | JsonLdRef[];
  [key: string]: unknown;
}

interface SkosDocument {
  "@context"?: Record<string, unknown>;
  graph: SkosNode[];
}

// ---------- Utilitaires ----------

/** Extrait une chaîne lisible d'une valeur qui peut être une string,
 *  un objet {lang, value}, ou un tableau de ces deux formes (on privilégie 'en'). */
function extractLabel(value: LangValue | LangValue[] | undefined): string | undefined {
  if (value === undefined) return undefined;

  const values = Array.isArray(value) ? value : [value];
  const normalized = values.map((v) => (typeof v === "string" ? { value: v } : v));

  const english = normalized.find((v) => v.lang === "en" || v.lang === undefined);
  return (english ?? normalized[0])?.value;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function hasType(node: SkosNode, type: string): boolean {
  return asArray(node.type).includes(type);
}

/** Nom de fichier "safe" dérivé du dernier segment de l'URI du concept scheme. */
function slugFromUri(uri: string): string {
  const last = uri.replace(/\/+$/, "").split("/").pop() ?? "thesaurus";
  return last.replace(/[^a-zA-Z0-9_-]/g, "-");
}

// ---------- Cœur de la conversion ----------

interface ConceptEntry {
  label: string;
  uri: string;
}

interface ConversionResult {
  schemeUri: string;
  schemeTitle: string;
  concepts: ConceptEntry[];
}

function convert(doc: SkosDocument): ConversionResult {
  const nodes = doc.graph;

  const scheme = nodes.find((n) => hasType(n, "skos:ConceptScheme"));
  if (!scheme) {
    throw new Error("Aucun skos:ConceptScheme trouvé dans le graphe JSON-LD.");
  }

  const schemeTitle = extractLabel(scheme["dct:title"] as LangValue) ?? slugFromUri(scheme.uri);

  // Ordre de préférence : suivre skos:hasTopConcept si présent, sinon prendre
  // tous les skos:Concept du graphe, dans leur ordre d'apparition.
  const topConceptRefs = asArray(scheme["skos:hasTopConcept"]);
  const conceptNodesByUri = new Map(
    nodes.filter((n) => hasType(n, "skos:Concept")).map((n) => [n.uri, n])
  );

  const orderedUris =
    topConceptRefs.length > 0
      ? topConceptRefs.map((ref) => ref.uri)
      : Array.from(conceptNodesByUri.keys());

  const concepts: ConceptEntry[] = orderedUris
    .map((uri) => conceptNodesByUri.get(uri))
    .filter((n): n is SkosNode => n !== undefined)
    .map((n) => {
      const label = extractLabel(n.prefLabel);
      if (!label) {
        throw new Error(`Concept sans prefLabel exploitable : ${n.uri}`);
      }
      return { label, uri: n.uri };
    });

  if (concepts.length === 0) {
    throw new Error("Aucun skos:Concept trouvé pour ce concept scheme.");
  }

  return { schemeUri: scheme.uri, schemeTitle, concepts };
}

// ---------- Génération des artefacts ----------

function buildJsonSchema(result: ConversionResult): object {
  return {
    $schema: "https://json-schema.org/draft/07/schema",
    $id: `${result.schemeUri}/schema.json`,
    title: result.schemeTitle,
    description: `Enumération générée à partir du thésaurus SKOS '${result.schemeTitle}' (${result.schemeUri}).`,
    type: "string",
    // enum: result.concepts.map((c) => c.label),
    oneOf: result.concepts.map((c) => ({
      const: c.label,
      description: c.uri,
    })),
  };
}

function buildJsonLdContext(result: ConversionResult): object {
  const termName = result.schemeTitle.replace(/[^a-zA-Z0-9]/g, "");

  const context: Record<string, unknown> = {
    skos: "http://www.w3.org/2004/02/skos/core#",
    dct: "http://purl.org/dc/terms/",
    [termName]: {
      "@id": result.schemeUri,
      "@type": "@vocab",
    },
  };

  for (const c of result.concepts) {
    context[c.label] = c.uri;
  }

  return { "@context": context };
}

// ---------- Point d'entrée CLI ----------

function main() {
  const [, , inputPath, outputDirArg] = process.argv;

  if (!inputPath) {
    console.error("Usage: skos-to-jsonschema.ts <entree.jsonld> [dossier-sortie]");
    process.exit(1);
  }

  const outputDir = outputDirArg ?? path.dirname(inputPath);
  const raw = fs.readFileSync(inputPath, "utf-8");
  const doc = JSON.parse(raw) as SkosDocument;

  const result = convert(doc);
  const slug = slugFromUri(result.schemeUri);

  const schema = buildJsonSchema(result);
  const context = buildJsonLdContext(result);

  fs.mkdirSync(outputDir, { recursive: true });

  const schemaPath = path.join(outputDir, `${slug}.json`);
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + "\n", "utf-8");

  // const contextPath = path.join(outputDir, `${slug}.context.jsonld`);
  // fs.writeFileSync(contextPath, JSON.stringify(context, null, 2) + "\n", "utf-8");

  console.log(`Concepts trouvés : ${result.concepts.map((c) => c.label).join(", ")}`);
  console.log(`JSON Schema écrit : ${schemaPath}`);
  // console.log(`Contexte JSON-LD écrit : ${contextPath}`);
}

main();
