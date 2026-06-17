import React, { useState } from "react";
import "./App.css";
import { validateJson, ValidationResult } from "./utils/validateJson";
import FileUploadCard from "./components/FileUploadCard";
import useJsonFile from "./hooks/useJsonFile";


export default function App() {
  const data = useJsonFile();
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const parseError = data.parseError;
  const ready = data.content !== null && !parseError;

  async function handleValidate() {
    if (!ready) return;
    setLoading(true);
    setResult(null);
    setRuntimeError(null);
    console.log("[validator] starting validation");
    try {
      const result = await validateJson(data.content);
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
      <h1>JSON EOPF-EOS Validator</h1>

      <div className="upload-grid">
        <FileUploadCard
          label=""
          hint="The file to validate"
          icon="📄"
          file={data.file}
          content={data.content}
          onFile={(f) => { data.handleFile(f); setResult(null); setRuntimeError(null); }}
          onText={(t) => { data.handleText(t); setResult(null); setRuntimeError(null); }}
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
