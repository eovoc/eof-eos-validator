# syntax=docker/dockerfile:1

# --- Build stage: compile the CLI into a single executable jar ---------------------------
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /build
COPY pom.xml .
# Warm the dependency cache in its own layer so code edits don't re-download everything.
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package && cp target/jsonschema-to-uml.jar /build/app.jar

# --- Runtime stage: minimal Alpine JRE + graphviz (needed by PlantUML for layout) --------
FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache graphviz
WORKDIR /app
COPY --from=build /build/app.jar /app/jsonschema-to-uml.jar

# java -jar jsonschema-to-uml.jar <input.json|folder> <output-dir> [model-name]
ENTRYPOINT ["java", "-jar", "/app/jsonschema-to-uml.jar"]
