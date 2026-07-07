import { useContext, useState, useEffect } from "react";
import { JsonFileContext } from "../App";
import Editor from "@monaco-editor/react";
import {convert} from "../utils/stacConverter";
import {stacValidator} from "../utils/stacValidator";
import {ValidationResult} from "../utils/ValidationResult";

export default function StacConverterPage() {
  const { content } = useContext(JsonFileContext)!;
  const [stacContent, setStacContent] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<String | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  useEffect(() => { handleConvert(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConvert() {
    if (!content) return;
    setLoading(true);
    setError(null);
    setStacContent(undefined);
    try {

      let conversionResult = await convert(content);
      if(conversionResult.result != null){
        setStacContent(conversionResult.result)
      }else{
        setError(conversionResult.error === null ? null :conversionResult.error.message);
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!stacContent) return;
    const blob = new Blob([stacContent], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stac.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleValidate() {
    if (loading) return;
    setValidationResult(null);
    console.log("[validator] starting validation");
    try {
      const result = await stacValidator(stacContent);
      setValidationResult(result);
      console.log("[validator] done", validationResult);

    } catch (e) {
      console.error("[validator] error", e);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading ? (<p> Loading ...</p>): (<p>STAC Representation</p>)}

      <div className="upload-grid">
        {content ? (
          <div className="upload-paste-area">
            <Editor
              className="editor"
              language="json"
              value={stacContent}
              options={{
                automaticLayout: true,
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 2,
              }}
            />
          </div>
        ) : (
          <p>No JSON loaded yet. Upload or paste an EOF-EOS metadata file first.</p>
        )}
      </div>

      <div className="button-grid">
        <button className="primary-btn"
                 disabled={!stacContent}
        onClick={handleValidate}>
          Validate
        </button>

        <button className="primary-btn" onClick={handleDownload} disabled={!stacContent}>
          Download
        </button>
      </div>

      {error && <div className="parse-error">⚠ {error}</div>}

      {validationResult && (
          <div className={`result ${validationResult.valid ? "valid" : "invalid"}`}>
            {validationResult.valid ? (
                <p className="result-title">✓ Valid — the file conforms to the schema.</p>
            ) : (
                <>
                  <p className="result-title">✗ Invalid — {validationResult.errors!.length} error{validationResult.errors!.length !== 1 ? "s" : ""} found.</p>

                  <ul className="error-list">
                    {validationResult.errors!.map((err, i) => (
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
    </>
  );
}
