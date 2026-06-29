import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { prettyPrint } from "../utils/jsonUtil";

function FileUploadCard({
  label,
  hint,
  icon,
  file,
  content,
  onFile,
  onText,
  accept,
}: {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  content: unknown;
  onFile: (f: File | null) => void;
  onText: (text: string) => void;
  accept: string;
}) {
  const [mode, setMode] = useState<"file" | "paste">("paste");
  const [editorText, setEditorText] = useState(content != null ? prettyPrint(content) : "");

  //Effect used to update EditJson tab after uploading a JSON file.
  // When a file is successfully parsed, switch to the editor tab and show the content.
  // Guard on `file` so this doesn't fire when content was set via the editor.
  useEffect(() => {
    if (file !== null && content !== null) {
      setEditorText(prettyPrint(content));
      setMode("paste");
    }
  }, [file, content]);

  function switchMode(newMode: "file" | "paste") {
    if (newMode === mode) return;
    setMode(newMode);
    setEditorText("");
    if (newMode === "paste") {
      onFile(null);
    }
  }

  function handleEditorChange(value: string | undefined) {
    const text = value ?? "";
    setEditorText(text);
    onText(text);
  }

  const hasContent = mode === "file" ? !!file : !!editorText;

  return (
    <div className={`upload-card ${hasContent ? "has-file" : ""}`}>
      {/* Buttons */}
      <div className="upload-tabs">
        <button
          className={`upload-tab ${mode === "file" ? "active" : ""}`}
          onClick={() => switchMode("file")}
          type="button"
        >
          Upload file
        </button>
        <button
          className={`upload-tab ${mode === "paste" ? "active" : ""}`}
          onClick={() => switchMode("paste")}
          type="button"
        >
          Edit JSON
        </button>
      </div>

      {/* Upload/Edit area */}
      {mode === "file" ? (
        <div className="upload-file-area">
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
      ) : (
        <div className="upload-paste-area">
          <div className="upload-label">{label}</div>
          <Editor
            className="editor"
            language="json"
            value={editorText}
            onChange={handleEditorChange}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              formatOnPaste: true,
              tabSize: 2,
            }}
          />
        </div>
      )}
    </div>
  );
}

export default FileUploadCard;
