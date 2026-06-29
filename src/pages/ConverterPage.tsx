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
    const blob = new Blob([result], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stac.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {loading ? (<p> Loading ...</p>): (<p>STAC Representation</p>)}

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
        <button className="primary-btn" disabled={true} >
          Validate
        </button>

        <button className="primary-btn" onClick={handleDownload} disabled={!result}>
          Download
        </button>
      </div>

      {error && <div className="parse-error">⚠ {error}</div>}
    </>
  );
}
