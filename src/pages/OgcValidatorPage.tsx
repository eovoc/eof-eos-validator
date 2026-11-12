import {useContext, useEffect, useState} from "react";
import { useNavigate } from "react-router";
import { ogcValidator } from "../features/ogcValidator";
import FileUploadCard from "../components/FileUploadCard";
import {ValidationReport} from "../types/ValidationResult";
import {JsonFileContext, SettingsFileContext} from "../App";
import DocumentationPanel from "../components/DocumenationPanel";
import ValidationReportPanel from "../components/ValidationReportPanel";
import ExampleSelector from "../components/ExampleSelector";
import {DocumentationSection} from "../types/DocumentationSection";

export default function OgcValidatorPage() {
  const { content, setContent } = useContext(JsonFileContext)!;
  const { settings } = useContext(SettingsFileContext)!;

  const [result, setResult] = useState<ValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  // FileUploadCard reads the content only when it is created: a new key
  // recreates it, so that a loaded example replaces the text of the editor.
  const [editorKey, setEditorKey] = useState(0);

  const sections: DocumentationSection[] =[
      {title:"References", links: [
          {name:"EOPF-EOS Metadata Specification", href:"https://eof-eos.io.esa.int/eopf-eos/data-model/6-metadata.html"},
          {name:"EOPF-EOS Metadata Schema Viewer", href:"https://eovoc.github.io/schema-viewer?schema=https%3A%2F%2Feovoc.github.io%2Feof-eos-validator%2Fschemas%2Feof-eos-schema-soft.json"},
          {name:"EOPF-EOS Metadata Schema", href:`${process.env.PUBLIC_URL}/schemas/eof-eos-schema-strict.json`},
          {name:"ISO 19115-4 Data Quality Metadata Schema (dqc.json)", href:`${process.env.PUBLIC_URL}/schemas/dqc.json`},
          {name:"ISO 19115-4 Resource Lineage Metadata Schema (mdj.json)", href:`${process.env.PUBLIC_URL}/schemas/mdj.json`},
          ]},

  ];

  const ready = content !== null && !parseError;
  let navigate = useNavigate();

  //Reset validation result when content has changed.
  useEffect(() => {
    setResult(null);
  }, [content, settings]);


  function handleExample(example: unknown) {
    setParseError(null);
    setContent(example);
    setEditorKey((key) => key + 1);
  }

  async function handleValidate() {
    if (!ready) return;
    setLoading(true);
    setResult(null);
    setRuntimeError(null);
    console.log("[validator] starting validation");
    try {
      const result = await ogcValidator(content, settings?.requiredProperties ?? []);
      console.log("[validator] done", result);
      setResult(result);

    } catch (e) {
      console.error("[validator] error", e);
      setRuntimeError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ExampleSelector onLoad={handleExample} />

      <div className="upload-grid">
        <FileUploadCard
          key={editorKey}
          label=""
          hint="The file to validate"
          icon="📄"
          content={content}
          setContent={setContent}
          setError={setParseError}
          accept=".json,application/json"
        />
      </div>

      <div className="button-grid">
        <button className="primary-btn" onClick={handleValidate} disabled={!ready || loading}>
          {loading ? "Fetching referenced schemas…" : "Validate"}
        </button>

        {/*id results defined and valid button is not disabled di*/}
        <button className="primary-btn"
                disabled={!(result ? result.valid : false)}
                onClick={() => {navigate("/converter")}}>

          {loading ? "Fetching referenced schemas…" : "Convert"}
        </button>
      </div>

      {runtimeError && <div className="parse-error">⚠ {runtimeError}</div>}
      {parseError && <div className="parse-error">⚠ {parseError}</div>}

      {(result && !parseError)&& (
              <>
                <h2>Validation Report</h2>
                <ValidationReportPanel report={result}
                                       validTitle="Valid EOPF-EOS Metadata"
                                       invalidTitle="Invalid EOPF-EOS Metadata"/>
              </>
      )}

      <DocumentationPanel sections={sections} />
    </>
  );
}
