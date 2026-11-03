import { ChangeEvent, useEffect, useState } from "react";
import { fetchJson} from "../utils/jsonUtil";

// Drop-down list of the EOF-EOS examples of public/examples/. The list itself
// is public/examples/index.json (maintained by hand: a static site cannot list
// a folder). Selecting an example fetches it and hands the parsed JSON to onLoad.

export interface ExampleEntry {
  file: string;
  label: string;
}

const EXAMPLES_URL = `${process.env.PUBLIC_URL}/examples`;
const MANIFEST_URL = `${EXAMPLES_URL}/index.json`;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function ExampleSelector({ onLoad }: Readonly<{ onLoad: (content: unknown) => void }>) {
  const [examples, setExamples] = useState<ExampleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson(MANIFEST_URL)
      .then((list) => {
        if (!Array.isArray(list)) {
          throw new Error("index.json must contain a list");
        }
        if (!cancelled) setExamples(list as ExampleEntry[]);
      })
      .catch((e) => {
        if (!cancelled) setError(`Could not load the list of examples (${errorMessage(e)}).`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const example = examples.find((entry) => entry.file === event.target.value);
    if (!example) return;
    setLoading(true);
    setError(null);
    try {
      onLoad(await fetchJson(`${EXAMPLES_URL}/${encodeURIComponent(example.file)}`));
    } catch (e) {
      setError(`Could not load "${example.label}" (${errorMessage(e)}).`);
    } finally {
      setLoading(false);
    }
  }

  if (examples.length === 0 && !error) {
    return null;
  }

  return (
    <div className="example-selector">
      <label htmlFor="example-select">Examples</label>
      {/* Always back on the placeholder, so the same example can be loaded again after editing it. */}
      <select id="example-select" value="" onChange={handleChange} disabled={loading || examples.length === 0}>
        <option value="">{loading ? "Loading…" : "Load an example…"}</option>
        {examples.map((example) => (
          <option key={example.file} value={example.file}>{example.label}</option>
        ))}
      </select>
      {error && <span className="example-selector-error">⚠ {error}</span>}
    </div>
  );
}
