import { useState, useEffect } from "react";

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
  const [pastedText, setPastedText] = useState("");

  //Effect used to update EditJson tab after uploading a JSON file.
  // When a file is successfully parsed, switch to the editor tab and show the content.
  // Guard on `file` so this doesn't fire when content was set via the textarea.
  useEffect(() => {
    if (file !== null && content !== null) {
      setPastedText(JSON.stringify(content, null, 2));
      setMode("paste");
    }
  }, [file, content]);

  function switchMode(newMode: "file" | "paste") {
    if (newMode === mode) return;
    setMode(newMode);
    setPastedText("");
    if (newMode === "paste") {
      onFile(null);
    } else {
      onText("");
    }
  }

  const hasContent = mode === "file" ? !!file : !!pastedText;

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
          <textarea
            className="paste-area"
            placeholder='{ "paste": "your JSON here" }'
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              onText(e.target.value);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData("text");
              try {
                //Pretty print
                const pretty = JSON.stringify(JSON.parse(text), null, 2);
                setPastedText(pretty);
                onText(pretty);
              } catch {
                //in case pretty-print fails
                setPastedText(text);
                onText(text);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

export default FileUploadCard;
