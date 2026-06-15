import React, { useState } from "react";
import "./App.css";
import { validateJson, ValidationResult } from "./validateJson";

function useJsonFile() {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<unknown>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    setFile(f);
    setContent(null);
    setParseError(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setContent(JSON.parse(e.target!.result as string));
      } catch {
        setParseError(`"${f.name}" is not valid JSON.`);
      }
    };
    reader.readAsText(f);
  }

  return { file, content, parseError, handleFile };
}

function FileUploadCard({
  label,
  hint,
  icon,
  file,
  onFile,
  accept,
}: {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept: string;
}) {
  return (
    <div className={`upload-card ${file ? "has-file" : ""}`}>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div className="upload-icon">{icon}</div>
      <div className="upload-label">{label}</div>
      <div className="upload-hint">{hint}</div>
      {file && <div className="file-name">{file.name}</div>}
    </div>
  );
}

export default function App() {
  const data = useJsonFile();
  const schema = useJsonFile();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const parseError = data.parseError ?? schema.parseError;
  const ready = data.content !== null && schema.content !== null && !parseError;

  async function handleValidate() {
    if (!ready) return;
    setLoading(true);
    setResult(null);
    setRuntimeError(null);
    console.log("[validator] starting validation");
    try {
      const result = await validateJson(data.content, schema.content as object);
      console.log("[validator] done", result);
      setResult(result);
    } catch (e) {
      console.error("[validator] error", e);
      setRuntimeError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <h1>JSON Validator</h1>
      <p className="subtitle">Upload a JSON file and a JSON Schema to validate it.</p>

      <div className="upload-grid">
        <FileUploadCard
            label="JSON Schema"
            hint="The schema to validate against"
            icon="📋"
            file={schema.file}
            onFile={(f) => { schema.handleFile(f); setResult(null); setRuntimeError(null); }}
            accept=".json,application/json"
        />
        <FileUploadCard
          label="JSON File"
          hint="The file to validate"
          icon="📄"
          file={data.file}
          onFile={(f) => { data.handleFile(f); setResult(null); setRuntimeError(null); }}
          accept=".json,application/json"
        />
      </div>

      {parseError && <div className="parse-error">⚠ {parseError}</div>}

      <button className="validate-btn" onClick={handleValidate} disabled={!ready || loading}>
        {loading ? "Fetching referenced schemas…" : "Validate"}
      </button>

      {runtimeError && <div className="parse-error">⚠ {runtimeError}</div>}

      {result && (
        <div className={`result ${result.valid ? "valid" : "invalid"}`}>
          {result.valid ? (
            <p className="result-title">✓ Valid — the file conforms to the schema.</p>
          ) : (
            <>
              <p className="result-title">✗ Invalid — {result.errors!.length} error{result.errors!.length !== 1 ? "s" : ""} found.</p>
              <ul className="error-list">
                {result.errors!.map((err, i) => (
                  <li key={i} className="error-item">
                    <span className="error-path">{err.instancePath}</span>
                    <span className="error-msg">{err.message}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
