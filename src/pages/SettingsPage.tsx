import {useContext, useEffect, useState} from "react";
import { useNavigate } from "react-router";
import {ValidationReport} from "../services/ValidationResult";
import {SettingsFileContext} from "../App";

export default function SettingsPage() {

  const { settings, setSettings } = useContext(SettingsFileContext)!;

  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = settings !== null && !error;
  let navigate = useNavigate();

  //Reset validation result when content has changed.
  useEffect(() => {
    setResult(null);
  }, [settings]);


  async function handleSettings() {
    if (!ready) return;
    setLoading(true);
    setResult(null);
    try {

      //TODO

    } catch (e) {
      console.error("[validator] error", e);
    } finally {
      setLoading(false);
    }
  }

  function handleFile(f: File | null) {
    setFile(f);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setSettings(e.target!.result as string);
      } catch {
        setError(`"${f.name}" is not valid JSON.`);
      }
    };
    reader.readAsText(f);
  }

  return (
    <>
      <div className="upload-file-area">
        <input
            type="file"
            accept="text/csv"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="upload-icon">📄</div>
        <div className="upload-label"></div>
        <div className="upload-hint">Settings file</div>
        {file && <div className="file-name">{file.name}</div>}
      </div>

      <div className="button-grid">
        <button className="primary-btn" onClick={handleSettings} disabled={!ready || loading}>
          Save
        </button>

        <button className="primary-btn"
                disabled={!(result ? result.valid : false)}
                onClick={() => {navigate("/converter")}}>
          Cancel
        </button>
      </div>

    </>
  );
}
