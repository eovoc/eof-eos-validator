# SKOS to JSON Schema conversion

Converts SKOS thesauri (JSON-LD, one `skos:ConceptScheme` with its
`skos:Concept`s) into a JSON Schema enum plus a matching JSON-LD context.

## Requirements

- Node.js (v16+; tested with v22)
- Project dependencies installed at the repo root:
  ```bash
  npm install
  ```
  This provides `ts-node` and `typescript` (used via `npx`, no global install needed).

## Usage

### Convert a single file

```bash
npx ts-node scripts/skos-to-jsonschema.ts <input.jsonld> [output-dir]
```

- `input.jsonld` — SKOS thesaurus in JSON-LD format.
- `output-dir` — optional; defaults to the input file's directory.

Produces two files named after the concept scheme's URI slug:
- `<slug>.json` — JSON Schema with an `enum` of the concepts' `prefLabel`s.
- `<slug>.context.jsonld` — JSON-LD context mapping each label to its concept URI.

### Convert every thesaurus at once

```bash
./scripts/convert.sh
```

This runs the converter for every `*.json` file in `scripts/skos/` and
writes the generated schema/context files to `scripts/schema/`.

To add a new thesaurus, drop its SKOS JSON-LD file into `scripts/skos/`
and re-run `convert.sh`.
