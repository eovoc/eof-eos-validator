import { useState } from "react";

function FileUploadCard({
  label,
  hint,
  icon,
  file,
  onFile,
  onText,
  accept,
}: {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  onFile: (f: File | null) => void;
  onText: (text: string) => void;
  accept: string;
}) {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [pastedText, setPastedText] = useState("");

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
          Paste JSON
        </button>
      </div>

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
                const pretty = JSON.stringify(JSON.parse(text), null, 2);
                setPastedText(pretty);
                onText(pretty);
              } catch {
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
