#!/usr/bin/env node
// Lists the entries of "definitions.thesaurus" that are never referenced
// through a "$ref" in the schema (refs located inside the entry itself are
// ignored, so a self-referencing entry still counts as unused).
//
// Usage: node list-unused-thesaurus.js [schema.json]
// Default schema: public/schemas/eof-eos-schema-strict.json
// Exit code: 0 if every entry is used, 1 if some are unused, 2 on error.

const fs = require("fs");
const path = require("path");

const DEFAULT_SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "public",
  "schemas",
  "eof-eos-schema-strict.json"
);

const THESAURUS_POINTER = "/definitions/thesaurus/";

// JSON Pointer unescaping (RFC 6901) + URI percent-decoding.
function decodeToken(token) {
  let t = token;
  try {
    t = decodeURIComponent(t);
  } catch (_) {
    /* keep raw */
  }
  return t.replace(/~1/g, "/").replace(/~0/g, "~");
}

// Returns the thesaurus entry name targeted by a $ref, or null.
function thesaurusTarget(ref) {
  const hash = ref.indexOf("#");
  if (hash < 0) return null;
  const fragment = ref.slice(hash + 1);
  if (!fragment.startsWith(THESAURUS_POINTER)) return null;
  const rest = fragment.slice(THESAURUS_POINTER.length);
  if (!rest) return null;
  return decodeToken(rest.split("/")[0]);
}

// Walks the schema and records, for each thesaurus entry, where it is referenced.
// `owner` is the thesaurus entry currently being traversed (if any).
function collectRefs(node, pointer, owner, usages) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectRefs(item, `${pointer}/${i}`, owner, usages));
    return;
  }
  if (!node || typeof node !== "object") return;

  if (typeof node.$ref === "string") {
    const target = thesaurusTarget(node.$ref);
    if (target !== null && target !== owner) {
      if (!usages.has(target)) usages.set(target, []);
      usages.get(target).push(pointer || "/");
    }
  }

  for (const [key, value] of Object.entries(node)) {
    const childPointer = `${pointer}/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`;
    let childOwner = owner;
    if (pointer === "/definitions/thesaurus") childOwner = key;
    collectRefs(value, childPointer, childOwner, usages);
  }
}

function main() {
  const schemaPath = path.resolve(process.argv[2] || DEFAULT_SCHEMA_PATH);

  let schema;
  try {
    schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  } catch (err) {
    console.error(`Cannot read schema ${schemaPath}: ${err.message}`);
    process.exit(2);
  }

  const thesaurus = schema.definitions && schema.definitions.thesaurus;
  if (!thesaurus || typeof thesaurus !== "object") {
    console.error(`No "definitions.thesaurus" found in ${schemaPath}`);
    process.exit(2);
  }

  const usages = new Map();
  collectRefs(schema, "", null, usages);

  const names = Object.keys(thesaurus).sort();
  const unused = names.filter((name) => !usages.has(name));
  const unknown = [...usages.keys()].filter((name) => !(name in thesaurus)).sort();

  console.log(`Schema: ${path.relative(process.cwd(), schemaPath) || schemaPath}`);
  console.log(`Thesaurus definitions: ${names.length}, used: ${names.length - unused.length}, unused: ${unused.length}`);

  if (unused.length) {
    console.log("\nUnused thesaurus definitions:");
    unused.forEach((name) => console.log(`  - ${name}`));
  } else {
    console.log("\nAll thesaurus definitions are used.");
  }

  if (unknown.length) {
    console.log("\nWarning: $ref to missing thesaurus definitions:");
    unknown.forEach((name) =>
      console.log(`  - ${name} (from ${usages.get(name).join(", ")})`)
    );
  }

  process.exit(unused.length ? 1 : 0);
}

main();
