import {useContext, useState} from "react";
import {SettingsFileContext} from "../App";
import {Settings} from "../types/Settings";

//Parse a CSV file into a list of property names (one per cell, comma/semicolon separated).
function parseMandatoryPropertiesCsv(text: string): string[] {
  const values = text
    .split(/\r?\n/)
    .flatMap((line) => line.split(/[,;]/))
    .map((value) => value.trim().replace(/^"(.*)"$/, "$1").trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(values));
}

export default function SettingsPage() {

  const { settings, setSettings } = useContext(SettingsFileContext)!;

  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mandatoryProperties, setMandatoryProperties] = useState<string []>(settings?.mandatoryProperties ?? []);
  const [newProperty, setNewProperty] = useState("");

  //Update the edited list and save it in the settings right away (blank and duplicate entries are not saved).
  function updateMandatoryProperties(properties: string[]) {
    setMandatoryProperties(properties);
    const cleaned = Array.from(new Set(properties.map((p) => p.trim()).filter((p) => p.length > 0)));
    const newSettings: Settings = { ...(settings ?? {}), mandatoryProperties: cleaned };
    setSettings(newSettings);
    console.log("Settings: ", newSettings);
  }

  function handleFile(f: File | null) {
    setFile(f);
    setError(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const properties = parseMandatoryPropertiesCsv(e.target!.result as string);
        if (properties.length === 0) {
          setError(`"${f.name}" does not contain any property.`);
          return;
        }
        updateMandatoryProperties(properties);
      } catch {
        setError(`"${f.name}" is not a valid CSV file.`);
      }
    };
    reader.readAsText(f);
  }

  function updateProperty(index: number, value: string) {
    updateMandatoryProperties(mandatoryProperties.map((p, i) => (i === index ? value : p)));
  }

  function removeProperty(index: number) {
    updateMandatoryProperties(mandatoryProperties.filter((_, i) => i !== index));
  }

  function addProperty() {
    const value = newProperty.trim();
    if (!value || mandatoryProperties.includes(value)) return;
    updateMandatoryProperties([...mandatoryProperties, value]);
    setNewProperty("");
  }

  return (
    <>
      <h2>Mandatory properties</h2>
      <div className="upload-file-area">
        <input
            type="file"
            accept="text/csv"
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
        <div className="property-list-title">Mandatory properties ({mandatoryProperties.length})</div>
        {mandatoryProperties.map((property, index) => (
          <div className="property-row" key={index}>
            <input
                type="text"
                className="property-input"
                value={property}
                onChange={(e) => updateProperty(index, e.target.value)}
            />
            <button className="property-remove-btn" onClick={() => removeProperty(index)} title="Remove">
              ✕
            </button>
          </div>
        ))}
        <div className="property-row">
          <input
              type="text"
              className="property-input"
              placeholder="Add a property"
              value={newProperty}
              onChange={(e) => setNewProperty(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addProperty(); }}
          />
          <button className="property-add-btn" onClick={addProperty} disabled={!newProperty.trim()} title="Add">
            +
          </button>
        </div>
      </div>

    </>
  );
}
