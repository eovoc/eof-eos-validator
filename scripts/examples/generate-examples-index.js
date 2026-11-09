#!/usr/bin/env node
// Regenerates public/examples/index.json from the *.json files in
// public/examples/ (the manifest read by src/components/ExampleSelector.tsx).
//
// - Entries whose file still exists keep their position and their label, so
//   hand-edited labels survive.
// - Entries whose file was removed are dropped.
// - New files are appended (sorted by name) with a label derived from the
//   file name: "Example-Foo-Bar.json" -> "Foo Bar Example".
//
// Usage: node scripts/examples/generate-examples-index.js [examples-dir]

const fs = require("fs");
const path = require("path");

const examplesDir = path.resolve(process.argv[2] || path.join(__dirname, "../../public/examples"));
const indexPath = path.join(examplesDir, "index.json");
const INDEX_NAME = "index.json";

function deriveLabel(file) {
  const base = path.basename(file, ".json");
  const hasPrefix = /^Example[-_ ]/i.test(base);
  const words = (hasPrefix ? base.replace(/^Example[-_ ]/i, "") : base)
    .split(/[-_ ]+/)
    .filter(Boolean);
  return hasPrefix ? `${words.join(" ")} Example` : words.join(" ");
}

function readExistingIndex() {
  if (!fs.existsSync(indexPath)) return [];
  const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error(`${indexPath} must contain a list`);
  }
  return parsed;
}

const files = fs
  .readdirSync(examplesDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== INDEX_NAME)
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const present = new Set(files);
const kept = readExistingIndex().filter((entry) => entry && present.has(entry.file));
const known = new Set(kept.map((entry) => entry.file));
const added = files.filter((file) => !known.has(file)).map((file) => ({ file, label: deriveLabel(file) }));

const index = [...kept, ...added];
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n");

console.log(`Wrote ${indexPath}: ${index.length} example(s)` +
  (added.length ? `, added ${added.map((e) => e.file).join(", ")}` : ""));
