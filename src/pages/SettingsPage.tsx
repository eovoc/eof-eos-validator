import {useContext, useState} from "react";
import {SettingsFileContext} from "../App";
import {Settings} from "../types/Settings";

export default function SettingsPage() {

  const { settings, setSettings } = useContext(SettingsFileContext)!;

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    setFile(f);
    setError(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const newSettings = JSON.parse(e.target!.result as string) as Settings;
        setSettings(newSettings)
      } catch {
        setError(`"${f.name}" is not a valid JSON file.`);
      }
    };
    reader.readAsText(f);
  }

  return (
    <>
      <div className="upload-file-area">
        <input
            type="file"
            accept="text/json"
            title="Upload mandatory properties"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="upload-icon">📄</div>
        <div className="upload-label"></div>
        <div className="upload-hint">Upload mandatory properties</div>
        {file && <div className="file-name">{file.name}</div>}
      </div>

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
