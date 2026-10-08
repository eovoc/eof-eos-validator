import ReactMarkdown from "react-markdown";

const text = `
# CLI Usage Documentation

The validation can be executed directly from a terminal, using the [AJV JSON Schema validator](https://ajv.js.org/).

## Prerequisites

1. Node should be installed on the host.
2. NPM should be installed on the host.
3. The ajv and ajv-cli packages should be installed.

To install ajv and ajv-cli with npm, use:

\`\`\`bash
npm install ajv ajv-cli
\`\`\`

## Execution

Open \`resources/example\` in a terminal and execute the following command:

\`\`\`bash
ajv validate --spec=draft2019 -c ajv-formats \\
  -m "public/schemas/json-schema-draft-07.json" \\
  -s "public/schemas/eof-eos-schema-strict.json" \\
  -r "public/schemas/dqc.json" -r "public/schemas/mdj.json" \\
  -d "resources/example/Example_Wrong.json" --all-errors
\`\`\`

## Resources

[JSON Draft 07](eof-eos-validator/schemas/json-schema-draft-07.json)

[eof-eos-schema-strict.json](eof-eos-validator/schemas/eof-eos-schema-strict.json)

[dqc.json](eof-eos-validator/schemas/dqc.json)

[mdj.json](eof-eos-validator/schemas/mdj.json)

`;

export default function CliDocumentationPage() {
    return (
        <>
            <ReactMarkdown>{text}</ReactMarkdown>
        </>
    );
}