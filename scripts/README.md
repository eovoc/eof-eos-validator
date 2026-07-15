# SKOS to JSON Schema conversion

Converts SKOS thesauri (JSON-LD, one `skos:ConceptScheme` with its
`skos:Concept`s) into a JSON Schema enum plus a matching JSON-LD context.

## Requirements

- Node.js (v16+; tested with v22)

## Usage

### Convert a single file

```bash
node scripts/skos-to-jsonschema.js <input.jsonld> [output-dir]
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
writes the generated schema/context files to `public/schemas/thesaurus/`,
which is where the app fetches them from at runtime. It also (re)writes
`public/schemas/thesaurus/manifest.json`, a JSON array of every generated
schema filename — `src/utils/ogcValidator.ts` fetches this manifest to
know which thesaurus schemas to load, since a static SPA can't list a
directory's contents on its own.

To add a new thesaurus, drop its SKOS JSON-LD file into `scripts/skos/`
and re-run `convert.sh`.
