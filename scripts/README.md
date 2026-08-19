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

### Extract one scheme out of a merged thesaurus export

`scripts/skosmos/esa-thesauri.rdf` is a full ESA thesaurus export already in
the generic `<rdf:Description>` form, but it bundles several concept
schemes (platforms, instruments, earth-topics) into one graph, and every
concept declares `skos:inScheme` — so there's no single Skosmos anchor to
key off like `skosmos-to-rdf.js` uses. `extract-thesaurus-scheme.js` pulls
one scheme back out, starting from whichever concept(s) declare
`skos:topConceptOf` the scheme and descending through `skos:narrower` using
one of two strategies:

```bash
node scripts/extract-thesaurus-scheme.js <input.rdf> <schemeUri> <output.rdf> [--mode=one-level|leaves]
```

- **`--mode=one-level`** (default): skip pure single-child pass-through
  categories (e.g. for platforms: Platform -> Space-based Platform -> Earth
  Observation Satellite) until reaching a concept whose narrower count is 0
  (a leaf, itself the top concept) or >1 (a branching category, whose
  direct children become the top concepts — one flattened level below the
  anchor). Fits a scheme with family-grouping semantics, where e.g. the
  satellite family "Metop" is itself one top concept even though it has
  narrower individual satellites Metop-A/B/C.

  ```bash
  node scripts/extract-thesaurus-scheme.js \
    scripts/skosmos/esa-thesauri.rdf \
    "https://earth.esa.int/concepts/concept_scheme/platforms" \
    scripts/rdf/platforms.rdf
  ```

- **`--mode=leaves`**: recursively collects every leaf concept (no
  `skos:narrower` children at all) anywhere under the root, regardless of
  how many branching levels deep. Fits a scheme that's a pure multi-level
  classification with no family-grouping semantics, where real members only
  ever appear as leaves (e.g. instruments: Instrument -> Earth Remote
  Sensing Instrument -> Active/Passive Remote Sensing -> ... -> SAR, MODIS,
  ...).

  ```bash
  node scripts/extract-thesaurus-scheme.js \
    scripts/skosmos/esa-thesauri.rdf \
    "https://earth.esa.int/concepts/concept_scheme/instruments" \
    scripts/rdf/instruments.rdf \
    --mode=leaves
  ```

The scheme's title is read from `rdfs:label`, falling back to `dct:title`
— in `esa-thesauri.rdf` a few scheme nodes (instruments, earth-topics)
carry a `dct:title` of "ESA Thesaurus" (the whole document's title, leaked
onto the scheme node) while their `rdfs:label` is scheme-specific.

The output is the same generic form `rdf-to-jsonschema.js` expects, so it
can be dropped straight into `scripts/rdf/` for `convert-rdf.sh` to pick up.

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
