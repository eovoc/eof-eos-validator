# jsonschema-to-uml (headless CLI + Docker image)

Generates a UML class diagram from a JSON Schema file, using the model-generation engine from
[SOM-Research/jsonSchema-to-uml](https://github.com/SOM-Research/jsonSchema-to-uml).

That upstream project is an **Eclipse GUI plugin only** — no CLI, no headless mode, and it
requires the full Eclipse Modeling Tools + Papyrus to view the result. This directory vendors
just its core generator (`edu.uoc.som.jsonschematouml.generators`/`.validator`, EPL-2.0, see
`LICENSE-jsonSchema-to-uml`), which is plain Java/EMF/UML2 with no UI dependency, wraps it in a
small CLI (`Main.java`), and renders the resulting UML2 model straight to PNG/SVG via PlantUML
(`Uml2PlantUml.java` walks the UML2 model and emits PlantUML class-diagram syntax) — no Eclipse
or Papyrus needed anywhere.

## Patches applied to the vendored generator

- `JSONSchemaToUML.analyze()`: the bundled syntax validator only understands JSON Schema
  draft-04 and rejects draft-06/07 constructs (e.g. numeric `exclusiveMinimum`/`exclusiveMaximum`).
  A draft mismatch now just logs a warning instead of skipping the file — the traversal logic
  itself is draft-version agnostic.
- `JSONSchemaToUML.analyzeProperty()`: draft-06+ allows an `"array"`-typed property with no
  `"items"` key at all (any item type allowed). The original code assumed `"items"` was always
  present and threw a `NullPointerException`; it's now handled gracefully.

## Build

```bash
docker build -t jsonschema-to-uml:latest tools/jsonschema-to-uml
```

Multi-stage build: `maven:3.9-eclipse-temurin-21-alpine` compiles a single shaded jar (generator
+ CLI + PlantUML), then the runtime stage is `eclipse-temurin:21-jre-alpine` plus `graphviz`
(PlantUML needs `dot` to lay out class diagrams). Final image is ~115MB.

## Run

```bash
docker run --rm \
  -v "$(pwd)/public/schemas:/schemas:ro" \
  -v "$(pwd)/out:/out" \
  jsonschema-to-uml:latest /schemas/eof-eos-schema.json /out eof-eos
```

Produces in `./out/`:
- `eof-eos.uml` — the UML2/XMI model (openable in Eclipse+Papyrus if you want the original tool's workflow)
- `eof-eos.puml` — PlantUML source
- `eof-eos.png` / `eof-eos.svg` — the rendered class diagram

Arguments: `<input.json|input-folder> <output-dir> [model-name]`. Pass the schemas *folder*
instead of a single file to resolve cross-file `$ref`s (e.g. `eof-eos-schema.json` references
`mdj.json#/definitions/LI_Lineage` and several `#/definitions/thesaurus/...` entries — passing
just the one file leaves those associations pointing at a placeholder `Unknown` class):

```bash
docker run --rm \
  -v "$(pwd)/public/schemas:/schemas:ro" \
  -v "$(pwd)/out:/out" \
  jsonschema-to-uml:latest /schemas /out schemas
```

## Local build/run without Docker

Requires JDK 17+, Maven, and `dot` (Graphviz) on `PATH`:

```bash
cd tools/jsonschema-to-uml
mvn -q package
java -jar target/jsonschema-to-uml.jar ../../public/schemas/eof-eos-schema.json ./out eof-eos
```
