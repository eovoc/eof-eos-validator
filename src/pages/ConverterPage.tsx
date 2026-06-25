import { useContext } from "react";
import { JsonFileContext } from "../App";
import Editor from "@monaco-editor/react";

export default function ConverterPage() {
  const { content } = useContext(JsonFileContext)!;

  return (
    <>
    <div className="upload-grid">
      {content ? (
        <div className="upload-paste-area">
          <Editor
            height="500px"
            language="json"
            // value={JSON.stringify(content, null, 2)}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              tabSize: 2,
            }}
          />
        </div>
      ) : (
        <p>No JSON loaded yet. Upload or paste a file first.</p>
      )}
    </div>
    <div className="button-grid">
        <button className="validate-btn"
                disabled={true}>
            Validate
        </button>

        {/*id results defined and valid button is not disabled di*/}
        <button className="convert-btn"
                disabled={true}
                // disabled={!(result ? result.valid : false)}
               >Download
        </button>
    </div>
    </>
  );
}
