/**
 * merge-thesaurus-schemas.js
 *
 * Merges every per-scheme JSON Schema in a directory (as produced by
 * rdf-to-jsonschema.js) into a single thesaurus.json, since a static SPA
 * can't fetch an arbitrary number of files without first knowing their
 * names. Each scheme's schema becomes a `definitions` entry keyed by its
 * filename (sans extension); the per-scheme files are removed once merged.
 *
 * Usage:
 *   node merge-thesaurus-schemas.js <schema-dir>
 */

const fs = require("fs");
const path = require("path");

function main() {
  const [, , dir] = process.argv;

  if (!dir) {
    console.error("Usage: merge-thesaurus-schemas.js <schema-dir>");
    process.exit(1);
  }

  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const definitions = {};
  for (const file of files) {
    const schema = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    const name = path.basename(file, ".json");
    definitions[name] = {
      title: schema.title,
      description: schema.description,
      type: schema.type,
      enum: schema.enum
    };
    fs.unlinkSync(path.join(dir, file));
  }

  const merged = {
    $schema: "https://json-schema.org/draft/07/schema",
    $id: "eof-eos/thesaurus",
    definitions
  };
  const mergedPath = path.join(dir, "thesaurus.json");
  fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2) + "\n");
  console.log("Merged schema written into:", mergedPath);
}

main();
