import { useContext, useState, useEffect } from "react";
import { JsonFileContext } from "../App";
import Editor from "@monaco-editor/react";
import {convert} from "../utils/stacConverter";

export default function ConverterPage() {
  const { content } = useContext(JsonFileContext)!;
  const [result, setResult] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<String | null>(null);

  useEffect(() => { handleConvert(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const editorValue = "";

  async function handleConvert() {
    if (!content) return;
    setLoading(true);
    setError(null);
    setResult(undefined);
    try {

      let conversionResult = await convert(content);
      if(conversionResult.result != null){
        setResult(conversionResult.result)
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
    if (!result) return;
    const blob = new Blob([result], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "converted.json";
    a.click();
    URL.revokeObjectURL(url);
  }


  return (
    <>
      <div className="upload-grid">
        {content ? (
          <div className="upload-paste-area">
            <Editor
              height="500px"
              language="json"
              value={result}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                tabSize: 2,
              }}
            />
          </div>
        ) : (
          <p>No JSON loaded yet. Upload or paste an OGC file first.</p>
        )}
      </div>

      <div className="button-grid">
        {/*<button className="validate-btn" disabled={!content || loading}>*/}
        {/*  Validate*/}
        {/*</button>*/}
        <button className="validate-btn" disabled={true}>
          Validate
        </button>

        <button className="convert-btn" onClick={handleDownload} disabled={!result}>
          Download
        </button>
      </div>

      {error && <div className="parse-error">⚠ {error}</div>}
    </>
  );
}
