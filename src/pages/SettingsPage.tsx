import {useContext, useRef, useState} from "react";
import {SettingsFileContext} from "../App";
import {Settings, validateSettings} from "../types/Settings";

export default function SettingsPage() {

  const { settings, setSettings } = useContext(SettingsFileContext)!;

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File | null) {
    setError(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(e.target!.result as string);
      } catch {
        setError(`"${f.name}" is not a valid JSON file.`);
        return;
      }
      const validationError = validateSettings(parsed);
      if (validationError) {
        setError(`"${f.name}" is not a valid settings file: ${validationError}.`);
        return;
      }
      setFile(f);
      setSettings(parsed as Settings);
    };
    reader.readAsText(f);
  }

  function handleExport() {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="button-grid">
        <button className="primary-btn" onClick={() => fileInputRef.current?.click()}>
          Import
        </button>
        <button className="primary-btn" onClick={handleExport} disabled={!settings}>
          Export
        </button>
      </div>
      <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            e.target.value = "";
          }}
      />
      {file && <div className="file-name">Imported: {file.name}</div>}

      {error && <div className="parse-error">{error}</div>}

      <div className="property-list">
        <div className="property-list-title">Mandatory properties ({settings?.requiredProperties.length})</div>
        {settings?.requiredProperties.map((property, index) => (
          <div className="property-row" key={index}>
            <input
                type="text"
                className="property-input"
                value={property}
                disabled={true}
            />
          </div>
        ))}

      <div className="property-list-title">Optional properties ({settings?.optionalProperties.length})</div>
      {settings?.optionalProperties.map((property, index) => (
          <div className="property-row" key={index}>
            <input
                type="text"
                className="property-input"
                value={property}
                disabled={true}
            />
          </div>
      ))}
    </div>

    </>
  );
}
