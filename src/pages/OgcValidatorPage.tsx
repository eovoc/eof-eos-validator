import {useContext, useEffect, useState} from "react";
import { useNavigate } from "react-router";
import { buildCustomSchema, ogcValidator } from "../features/ogcValidator";
import FileUploadCard from "../components/FileUploadCard";
import {ValidationReport} from "../types/ValidationResult";
import {JsonFileContext, SettingsFileContext} from "../App";
import DocumentationPanel from "../components/DocumenationPanel";
import ValidationReportPanel from "../components/ValidationReportPanel";
import ExampleSelector from "../components/ExampleSelector";
import {DocumentationSection} from "../types/DocumentationSection";

const documentation: string ="## References\n" +
    "\n" +
    "- [EO Metadata](https://eof-eos.io.esa.int/eopf-eos/data-model/6-metadata.html)\n" +
    "- [EOF-EOS Metadata Schema Viewer](https://eovoc.github.io/schema-viewer?schema=https%3A%2F%2Feovoc.github.io%2Feof-eos-validator%2Fschemas%2Feof-eos-schema-soft.json)\n" +
    "- [EOF-EOS Metadata Schema](${process.env.PUBLIC_URL}/schemas/eof-eos-schema-strict.json)\n" +
    "- [ISO 19115-4 Data Quality Metadata Schema (dqc.json)](${process.env.PUBLIC_URL}/schemas/dqc.json)\n" +
    "- [ISO 19115-4 Resource Lineage Metadata Schema (mdj.json)](${process.env.PUBLIC_URL}/schemas/mdj.json)";



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
  // Object URL of the custom schema (main schema + user-defined mandatory properties), if any.
  const [customSchemaUrl, setCustomSchemaUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    buildCustomSchema(settings?.requiredProperties ?? [])
      .then((schema:any) => {
        if (cancelled || !schema) return;
        const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
        url = URL.createObjectURL(blob);
        setCustomSchemaUrl(url);
      })
      .catch((e:any) => console.error("[validator] failed to build custom schema", e));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      setCustomSchemaUrl(null);
    };
  }, [settings]);

  const sections: DocumentationSection[] =[
      {title:"Documentation", links: [
          {name:"EO Metadata", href:"https://eof-eos.io.esa.int/eopf-eos/data-model/6-metadata.html"},
          {name:"EOF-EOS Schema Documentation", href:"https://eovoc.github.io/schema-viewer?schema=https%3A%2F%2Feovoc.github.io%2Feof-eos-validator%2Fschemas%2Feof-eos-schema-soft.json"}
        ]},
    {title:"EOF EOS Schema", links: [
        {name:"Schema", href:`${process.env.PUBLIC_URL}/schemas/eof-eos-schema-strict.json`},
        ...(customSchemaUrl ? [{name:"Custom Schema (with mandatory properties)", href: customSchemaUrl}] : []),
        ]},
    {title:"ISO19115-4 Schemas", links: [
        {name:"DQC Schema", href:`${process.env.PUBLIC_URL}/schemas/dqc.json`},
        {name:"MDJ Schema", href:`${process.env.PUBLIC_URL}/schemas/mdj.json`}
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
                                       validTitle="Valid EOF-EOS Metadata"
                                       invalidTitle="Invalid EOF-EOS Metadata"/>
              </>
      )}

      <DocumentationPanel sections={sections} />
    </>
  );
}
