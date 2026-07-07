import {useContext, useEffect, useState} from "react";
import { useNavigate } from "react-router";
import { ogcValidator } from "../utils/ogcValidator";
import FileUploadCard from "../components/FileUploadCard";
import {ValidationResult} from "../utils/ValidationResult";
import { JsonFileContext } from "../App";
import DocumentationPanel from "../components/DocumenationPanel";

export default function OgcValidatorPage() {
  const { content, setContent } = useContext(JsonFileContext)!;
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const ready = content !== null && !parseError;
  let navigate = useNavigate();

  //Reset validation result when content has changed.
  useEffect(() => {
    setResult(null);
  }, [content]);


  async function handleValidate() {
    if (!ready) return;
    setLoading(true);
    setResult(null);
    setRuntimeError(null);
    console.log("[validator] starting validation");
    try {
      const result = await ogcValidator(content);
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
    <>
      <div className="upload-grid">
        <FileUploadCard
          label=""
          hint="The file to validate"
          icon="📄"
          content={content}
          setContent={setContent}
          setError={setParseError}
          accept=".json,application/json"
        />
      </div>

      <div className="button-grid">
        <button className="primary-btn" onClick={handleValidate} disabled={!ready || loading}>
          {loading ? "Fetching referenced schemas…" : "Validate"}
        </button>

        {/*id results defined and valid button is not disabled di*/}
        <button className="primary-btn"
                disabled={!(result ? result.valid : false)}
                onClick={() => {navigate("/converter")}}>

          {loading ? "Fetching referenced schemas…" : "Convert"}
        </button>
      </div>

      {runtimeError && <div className="parse-error">⚠ {runtimeError}</div>}
      {parseError && <div className="parse-error">⚠ {parseError}</div>}

      {(result && !parseError)&& (
        <div className={`result ${result.valid ? "valid" : "invalid"}`}>
          {result.valid ? (
            <p className="result-title">Valid — the file conforms to the schema.</p>
          ) : (
            <>
              <p className="result-title">Invalid — {result.errors!.length} error{result.errors!.length !== 1 ? "s" : ""} found.</p>
              <a href={`${process.env.PUBLIC_URL}/schemas/eof-eos-schema.json`} target="_blank" rel="noreferrer">See Validation Schema</a>
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

      <DocumentationPanel ></DocumentationPanel>

    </>
  );
}
