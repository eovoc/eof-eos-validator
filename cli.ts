import { readFileSync } from "fs";
import { validateJson } from "./src/validateJson";

function parseArgs(argv: string[]) {
  const args = argv.slice(2);
  let dataArg: string | null = null;
  let schemaArg: string | null = null;
  let dataIsRaw = false;
  let schemaIsRaw = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--data" && args[i + 1]) {
      dataArg = args[++i];
      dataIsRaw = true;
    } else if (args[i] === "--schema" && args[i + 1]) {
      schemaArg = args[++i];
      schemaIsRaw = true;
    } else if (!dataArg) {
      dataArg = args[i];
    } else if (!schemaArg) {
      schemaArg = args[i];
    }
  }
  return { dataArg, schemaArg, dataIsRaw, schemaIsRaw };
}

function readJson(value: string, isRaw: boolean, label: string): unknown {
  const source = isRaw ? value : readFileSync(value, "utf8");
  try {
    return JSON.parse(source);
  } catch (e) {
    console.error(`Error: ${label} is not valid JSON — ${(e as Error).message}`);
    process.exit(1);
  }
}

async function main() {
  const { dataArg, schemaArg, dataIsRaw, schemaIsRaw } = parseArgs(process.argv);

  if (!dataArg || !schemaArg) {
    console.error("Usage: npm run validate -- <data.json> <schema.json>");
    console.error("       npm run validate -- --data '<json>' --schema '<json>'");
    console.error("       npm run validate -- --data '<json>' schema.json");
    process.exit(1);
  }

  const data = readJson(dataArg, dataIsRaw, "data");
  const schema = readJson(schemaArg, schemaIsRaw, "schema");

  const result = await validateJson(data, schema as object);

  if (result.valid) {
    console.log("Valid — the file conforms to the schema.");
    process.exit(0);
  } else {
    console.log(`Invalid — ${result.errors!.length} error(s) found:`);
    for (const err of result.errors!) {
      const path = err.instancePath || "(root)";
      console.log(`  ${path}: ${err.message}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Error:", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
