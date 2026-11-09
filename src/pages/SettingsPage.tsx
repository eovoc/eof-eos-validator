import {useContext, useRef, useState} from "react";
import type {JSX} from "react";
import type {IconBaseProps} from "react-icons";
import {FiDownload, FiUpload} from "react-icons/fi";
import {SettingsFileContext} from "../App";
import {Settings, validateSettings} from "../types/Settings";

// TS 4.9 rejects components typed as returning ReactNode (react-icons + @types/react 19),
// so narrow the icon types to return JSX.Element.
type Icon = (props: IconBaseProps) => JSX.Element;
const ImportIcon = FiDownload as Icon;
const ExportIcon = FiUpload as Icon;

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
      } catch(error) {
        setError(`"${f.name}" is not a valid JSON file. `+error);
        console.log(error);
        return;
      }
      const validationError = validateSettings(parsed);
      if (validationError) {
        setError(`"${f.name}" is not a valid settings file: ${validationError}.`);
        console.log(validationError);
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
          <ImportIcon className="btn-icon" aria-hidden="true" />
          Import
        </button>
        <button className="primary-btn" onClick={handleExport} disabled={!settings}>
          <ExportIcon className="btn-icon" aria-hidden="true" />
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
      {file && <div className="file-name centered">Imported: {file.name}</div>}

      {error && <div className="parse-error">{error}</div>}

      <div className="property-list">

        <details className="property-section" open>
          <summary className="property-list-title">Optional properties ({settings?.optionalProperties.length})</summary>
          {settings?.optionalProperties.map((property) => (
              <div className="property-row" key={property}>
                <input
                    type="text"
                    className="property-input"
                    value={property}
                    disabled={true}
                />
              </div>
          ))}
        </details>

        <details className="property-section" open>
          <summary className="property-list-title">Required properties ({settings?.requiredProperties.length})</summary>
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
        </details>
      </div>

    </>
  );
}
