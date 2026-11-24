import {useCallback, useContext, useRef, useState} from "react";
import type {JSX} from "react";
import type {IconBaseProps} from "react-icons";
import {FiDownload, FiUpload, FiArrowLeft, FiArrowRight} from "react-icons/fi";
import {SettingsFileContext} from "../App";
import {Settings, validate} from "../types/Settings";
import {sortAscending} from "../utils/settingsUtil";

// TS 4.9 rejects components typed as returning ReactNode (react-icons + @types/react 19),
// so narrow the icon types to return JSX.Element.
type Icon = (props: IconBaseProps) => JSX.Element;
const ImportIcon = FiDownload as Icon;
const ExportIcon = FiUpload as Icon;
const MoveLeftIcon = FiArrowLeft as Icon;
const MoveRightIcon = FiArrowRight as Icon;

export default function SettingsPage() {

  const { settings, setSettings } = useContext(SettingsFileContext)!;

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File | null)=> {
    setError(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      let parsed: Settings;
      try {
        parsed = JSON.parse(e.target!.result as string);
      } catch(error) {
        setError(`"${file.name}" is not a valid JSON file. `+error);
        console.log(error);
        return;
      }

      try{
        validate(parsed);
        setFile(file);
        if(!parsed.name){ parsed.name="current settings"}
        if(!parsed.version){ parsed.version="1.0"}
        const imported = parsed as Settings;
        setSettings({
          ...imported,
          optionalProperties: sortAscending(imported.optionalProperties),
          requiredProperties: sortAscending(imported.requiredProperties),
        });
      }catch(error){
          setError(`"${file.name}" is not a valid settings file: ${error}.`);
          console.log(error);
          return;
      }


    };
    reader.readAsText(file);
  },[setFile,setSettings,setError]);

  const  handleExport = useCallback((settings: Settings | null)=> {
    if (!settings) return;
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "current-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  },[]);

  const moveProperty = useCallback((property: string, to: "required" | "optional") => {
    if (!settings) return;
    const from = to === "required" ? settings.optionalProperties : settings.requiredProperties;
    const target = to === "required" ? settings.requiredProperties : settings.optionalProperties;
    const nextFrom = from.filter((p) => p !== property);
    const nextTarget = sortAscending(target.includes(property) ? target : [...target, property]);
    settings.name = "current settings";
    setSettings(to === "required"
      ? { ...settings, optionalProperties: nextFrom, requiredProperties: nextTarget }
      : { ...settings, requiredProperties: nextFrom, optionalProperties: nextTarget });
  }, [settings, setSettings]);

  return (
    <>
      <div className="button-grid">
        <button className="primary-btn" onClick={() => fileInputRef.current?.click()}>
          <ImportIcon className="btn-icon" aria-hidden="true" />
          Import
        </button>
        <button className="primary-btn" onClick={() => handleExport(settings)} disabled={!settings}>
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
      {settings && <div className="file-name centered">{settings?.name}</div>}

      {error && <div className="parse-error">{error}</div>}

      <div className="property-list">

        <details className="property-section" open>
          <summary className="property-list-title">Optional properties ({settings?.optionalProperties.length})</summary>
          {sortAscending(settings?.optionalProperties ?? []).map((property) => (
              <div className="property-row" key={property}>
                <input
                    type="text"
                    className="property-input"
                    value={property}
                    disabled={true}
                />
                <button
                    className="move-btn"
                    onClick={() => moveProperty(property, "required")}
                    title="Move to required properties"
                    aria-label={`Move ${property} to required properties`}
                >
                  <MoveRightIcon aria-hidden="true" />
                </button>
              </div>
          ))}
        </details>

        <details className="property-section" open>
          <summary className="property-list-title">Required properties ({settings?.requiredProperties.length})</summary>
          {sortAscending(settings?.requiredProperties ?? []).map((property) => (
            <div className="property-row" key={property}>
              <button
                  className="move-btn"
                  onClick={() => moveProperty(property, "optional")}
                  title="Move to optional properties"
                  aria-label={`Move ${property} to optional properties`}
              >
                <MoveLeftIcon aria-hidden="true" />
              </button>
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
