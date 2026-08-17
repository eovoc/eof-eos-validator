# RDF/XML to JSON Schema conversion

Converts SKOS thesauri exported as RDF/XML (one or more
`skos:ConceptScheme`s, each with its own `skos:Concept` top concepts) into
JSON Schema enums, then wires those enums into `eof-eos-schema.json` so
`src/utils/ogcValidator.ts` can validate against them.

## Requirements

- Node.js (v16+; tested with v22)

## Usage

### Convert a single RDF/XML file

`rdf-to-jsonschema.js` converts one RDF/XML export into JSON Schemas. A
single file may contain several `skos:ConceptScheme`s (e.g. an export
covering many enumerated properties at once). The script produces **one
JSON Schema per concept scheme** found in the file.

```bash
node scripts/rdf-to-jsonschema.js <input.rdf> [output-dir]
```

- `input.rdf` — SKOS thesaurus in RDF/XML format.
- `output-dir` — optional; defaults to the input file's directory.

For each concept scheme, the enum lists the `skos:prefLabel`s of its
`skos:hasTopConcept`s, deduplicated. The output filename is derived from
the scheme's title (`dct:title`), falling back to a slug of its URI. An
existing `<name>.json` in the output directory has its `enum` preserved
and extended rather than overwritten.

### Convert a raw Skosmos export first (if needed)

Some thesauri (e.g. `scripts/skosmos/platforms.rdf`) are raw Skosmos
"concept neighbourhood" exports: they use typed elements (`<skos:Concept>`,
`<skos:ConceptScheme>`) and express hierarchy only via
`skos:broader`/`skos:narrower`, with no `skos:hasTopConcept`. These need
converting to the generic `<rdf:Description>` form (with explicit
`dct:title` and `skos:hasTopConcept`/`skos:topConceptOf`) before
`rdf-to-jsonschema.js` can read them.

```bash
node scripts/skosmos-to-rdf.js <input.rdf> <output.rdf>
```

A scheme's top concepts are resolved as its own `skos:hasTopConcept` if
present, otherwise via whichever concept(s) declare `skos:inScheme` pointing
at the scheme (Skosmos marks only that one anchor concept as
`skos:inScheme`): if the anchor has `skos:narrower` children, those are the
thesaurus' real enum members (e.g. `platforms.rdf`, where the anchor is a
broad category); otherwise the anchor itself is a single leaf concept and
becomes the sole top concept (e.g. `instruments/ALT.rdf`, a Skosmos "concept
neighbourhood" export centered on one instrument). If neither is found, the
script errors out rather than guessing.

Run this before `convert-rdf.sh`, writing the result into `scripts/rdf/`
(e.g. `scripts/rdf/platforms-2026-08-11.rdf`) so it gets picked up by the
next step.

### Convert every RDF/XML thesaurus at once

```bash
./scripts/convert-rdf.sh
```

This clears and re-creates `public/schemas/thesaurus-rdf/`, then runs
`rdf-to-jsonschema.js` for every `*.rdf` file in `scripts/rdf/`, writing
one JSON Schema per concept scheme there. Two more scripts then run in
sequence:

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
   `"$ref": "#/definitions/thesaurus/acquisition-station-types"`. No
   separate fetch needed at runtime, since `eof-eos-schema.json` is already
   loaded to validate against. (Nesting under `definitions` rather than a
   bare top-level `thesaurus` key — matters: it's a real JSON Schema
   keyword, so Ajv's `strict: true` mode in `src/utils/ogcValidator.ts`
   doesn't reject it as an unknown keyword. It also preserves
   `eof-eos-schema.json`'s existing tab-indented, CRLF-terminated
   formatting rather than rewriting the whole file in Node's defaults.)

To add a new RDF/XML thesaurus export, drop it into `scripts/rdf/` and
re-run `convert-rdf.sh` this regenerates `thesaurus.json` and refreshes
the `definitions.thesaurus` section in `eof-eos-schema.json` to match.
