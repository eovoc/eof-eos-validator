#!/usr/bin/env node
// Compares public/schemas/thesaurus-rdf/old-thesaurus.json against thesaurus.json
// and reports new/deleted enums and new/deleted values within changed enums.

const fs = require("fs");
const path = require("path");

const OLD_SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "public",
  "schemas",
  "backup",
  "old-thesaurus.json"
);

const SCHEMA_PATH = path.resolve(
  __dirname,
  "..",
  "public",
  "schemas",
  "thesaurus-rdf",
  "thesaurus.json"
);

function collectEnums(node, name, out) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectEnums(item, name, out));
    return;
  }
  if (node && typeof node === "object") {
    if (Array.isArray(node.enum)) {
      out.push({ name, title: node.title, values: node.enum });
    }
    for (const [key, value] of Object.entries(node)) {
      collectEnums(value, key, out);
    }
  }
}

function loadEnums(schemaPath) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const enums = [];
  collectEnums(schema, null, enums);
  const byName = new Map();
  for (const e of enums) byName.set(e.name, e);
  return byName;
}

if (!fs.existsSync(OLD_SCHEMA_PATH)) {
  console.error(`Old schema not found at ${OLD_SCHEMA_PATH}`);
  process.exit(1);
}

const oldEnums = loadEnums(OLD_SCHEMA_PATH);
const newEnums = loadEnums(SCHEMA_PATH);

const addedEnums = [...newEnums.keys()].filter((name) => !oldEnums.has(name));
const removedEnums = [...oldEnums.keys()].filter((name) => !newEnums.has(name));
const commonEnums = [...newEnums.keys()].filter((name) => oldEnums.has(name));

console.log("=== New enums ===");
if (addedEnums.length === 0) {
  console.log("  (none)");
} else {
  addedEnums.forEach((name) => {
    const { title } = newEnums.get(name);
    console.log(`  - ${title || name} (${name})`);
  });
}
console.log("");

console.log("=== Deleted enums ===");
if (removedEnums.length === 0) {
  console.log("  (none)");
} else {
  removedEnums.forEach((name) => {
    const { title } = oldEnums.get(name);
    console.log(`  - ${title || name} (${name})`);
  });
}
console.log("");

console.log("=== Changed enum values ===");
let anyChanged = false;
for (const name of commonEnums) {
  const oldValues = new Set(oldEnums.get(name).values);
  const newValues = new Set(newEnums.get(name).values);
  const added = [...newValues].filter((v) => !oldValues.has(v));
  const removed = [...oldValues].filter((v) => !newValues.has(v));
  if (added.length === 0 && removed.length === 0) continue;

  anyChanged = true;
  const { title } = newEnums.get(name);
  console.log(`${title || name} (${name}):`);
  added.forEach((v) => console.log(`  + ${v}`));
  removed.forEach((v) => console.log(`  - ${v}`));
  console.log("");
}
if (!anyChanged) {
  console.log("  (none)");
}
