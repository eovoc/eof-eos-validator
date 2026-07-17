# SKOS to JSON Schema conversion

Converts SKOS thesauri (JSON-LD, one `skos:ConceptScheme` with its
`skos:Concept`s) into a JSON Schema enum.

Only top-level concepts (those without a `skos:narrower`) are included in
the enum — concepts that are narrower than another concept are skipped.

## Requirements

- Node.js (v16+; tested with v22)

## Usage

### Convert a single file

```bash
node scripts/skos-to-jsonschema.js <input.jsonld> [output-dir]
```

- `input.jsonld` — SKOS thesaurus in JSON-LD format.
- `output-dir` — optional; defaults to the input file's directory.

Produces one file, `<name>.json` — a JSON Schema with an `enum` of the
top-level concepts' `prefLabel`s. The name is derived from the concept
scheme's title (`dct:title` or `label`), falling back to a slug of its URI
if neither is present.

If `<name>.json` already exists in the output directory, its existing
`enum` values are preserved and any new labels are appended (no
duplicates), rather than overwriting the file.

### Convert every thesaurus at once

```bash
./scripts/convert.sh
```

This clears and re-creates `public/schemas/thesaurus/`, then runs the
converter for every `*.json` file in `scripts/skos/`, writing the generated
schema files there — this is where the app fetches them from at runtime.
It also (re)writes
`public/schemas/thesaurus/manifest.json`, a JSON array of every generated
schema filename — `src/utils/ogcValidator.ts` fetches this manifest to
know which thesaurus schemas to load, since a static SPA can't list a
directory's contents on its own.

To add a new thesaurus, drop its SKOS JSON-LD file into `scripts/skos/`
and re-run `convert.sh`.
