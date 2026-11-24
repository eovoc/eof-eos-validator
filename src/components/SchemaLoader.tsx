import { FormEvent, useState } from "react";
import { fetchJson } from "../utils/jsonUtil";

// URL field and "Load" button that fetch a remote JSON schema.
// The schema is only fetched and parsed as JSON: it is NOT validated here.
// The parsed schema and its URL are handed to onLoad.
export interface SchemaLoaderProps {
  onLoad: (url: string) => void;
  initialUrl?: string;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function SchemaLoader({ onLoad, initialUrl = "" }: Readonly<SchemaLoaderProps>) {
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = url.trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      onLoad(target);
    } catch (e) {
      setError(`Could not load the schema (${errorMessage(e)}).`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="schema-loader" onSubmit={handleSubmit}>
      <label htmlFor="schema-url">Schema</label>
      <input
        id="schema-url"
        type="url"
        placeholder="default"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
      />
      <button type="submit" className="primary-btn" disabled={loading || !url.trim()}>
        {loading ? "Loading…" : "Load"}
      </button>
      {error && <span className="schema-loader-error">⚠ {error}</span>}
    </form>
  );
}
