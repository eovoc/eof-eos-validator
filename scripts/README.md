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

## RDF/XML to JSON Schema conversion

`rdf-to-jsonschema.js` converts a SKOS thesaurus exported as RDF/XML into
JSON Schemas. Unlike `skos-to-jsonschema.js`, a single RDF/XML file may
contain several `skos:ConceptScheme`s (e.g. an export covering many
enumerated properties at once) — the script produces **one JSON Schema per
concept scheme** found in the file.

```bash
node scripts/rdf-to-jsonschema.js <input.rdf> [output-dir]
```

- `input.rdf` — SKOS thesaurus in RDF/XML format.
- `output-dir` — optional; defaults to the input file's directory.

For each concept scheme, the enum lists the `skos:prefLabel`s of its
`skos:hasTopConcept`s, deduplicated. The output filename is derived from the
scheme's title (`dct:title`), falling back to a slug of its URI, and — as
with `skos-to-jsonschema.js` — an existing `<name>.json` in the output
directory has its `enum` preserved and extended rather than overwritten.

### Convert every RDF/XML thesaurus at once

```bash
./scripts/convert-rdf.sh
```

This runs `rdf-to-jsonschema.js` for every `*.rdf` file in `scripts/rdf/`,
writing one JSON Schema per concept scheme to
`public/schemas/thesaurus-rdf/` — a directory kept separate from
`public/schemas/thesaurus/` so this script and `convert.sh` never clobber
each other's output. It clears and re-creates that directory each run.

Unlike `convert.sh`, it doesn't stop there — two more scripts run in
sequence afterwards:

1. **`merge-thesaurus-schemas.js`** merges every generated per-scheme
   schema into a single `public/schemas/thesaurus-rdf/thesaurus.json` and
   deletes the per-scheme files, since a static SPA has no way to discover
   how many thesaurus files exist or what they're named without a fixed
   entry point to fetch.

   ```bash
   node scripts/merge-thesaurus-schemas.js <schema-dir>
   ```

   Each scheme becomes a `definitions` entry in the merged file, keyed by
   its filename (sans extension) — `title`, `description`, `type`, and
   `enum`.

2. **`embed-thesaurus-schema.js`** embeds that merged file's `definitions`
   into `public/schemas/eof-eos-schema.json` itself, as a dedicated
   `definitions.thesaurus` section (kept last among `definitions`, and
   replaced in place on re-runs rather than duplicated).

   ```bash
   node scripts/embed-thesaurus-schema.js <thesaurus.json> <eof-eos-schema.json>
   ```

   Each thesaurus enum is then addressable as a local `$ref`, e.g.
   `"$ref": "#/definitions/thesaurus/acquisition-station-types"` — no
   separate fetch needed at runtime, since `eof-eos-schema.json` is already
   loaded to validate against. (Nesting under `definitions` — rather than a
   bare top-level `thesaurus` key — matters: it's a real JSON Schema
   keyword, so Ajv's `strict: true` mode in `src/utils/ogcValidator.ts`
   doesn't reject it as an unknown keyword. It also preserves
   `eof-eos-schema.json`'s existing tab-indented, CRLF-terminated
   formatting rather than rewriting the whole file in Node's defaults.)

To add a new RDF/XML thesaurus export, drop it into `scripts/rdf/` and
re-run `convert-rdf.sh` — this regenerates `thesaurus.json` and refreshes
the `definitions.thesaurus` section in `eof-eos-schema.json` to match.
