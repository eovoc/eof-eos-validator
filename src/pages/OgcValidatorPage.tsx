import {useContext, useEffect, useMemo, useState} from "react";
import { useNavigate } from "react-router";
import { buildCustomSchema, ogcValidator } from "../features/ogcValidator";
import FileUploadCard from "../components/FileUploadCard";
import {ValidationReport} from "../types/ValidationResult";
import {JsonFileContext, SettingsFileContext} from "../App";
import ValidationReportPanel from "../components/ValidationReportPanel";
import ExampleSelector from "../components/ExampleSelector";
import MarkdownDocumentationPanel from "../components/MarkdownDocumentationPanel";
import {toJsonDataUrl} from "../utils/jsonUtil";
import {loadSchema} from "../utils/schemaUtil";

let defaultSchemaUrl: string;
loadSchema().then((schema) =>{
  defaultSchemaUrl = toJsonDataUrl(schema);
});

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
  // data: URL of the custom schema (main schema + user-defined mandatory properties), if any.
  const [customSchemaUrl, setCustomSchemaUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    buildCustomSchema(settings?.requiredProperties ?? [])
      .then((schema) => {
        if (cancelled || !schema) return;
        setCustomSchemaUrl(toJsonDataUrl(schema));
      })
      .catch((e: unknown) => console.error("[validator] failed to build custom schema", e));
    return () => {
      cancelled = true;
      setCustomSchemaUrl(null);
    };
  }, [settings]);

  // Rebuilt only when the custom schema URL changes (it is the only variable part).
  const documentation = useMemo(() =>
      "## References\n" +
      "\n" +
      "- [EO Metadata](https://eof-eos.io.esa.int/eopf-eos/data-model/6-metadata.html)\n" +
      "- [EOPF-EOS Metadata Schema Viewer](https://eovoc.github.io/schema-viewer?schema=https%3A%2F%2Feovoc.github.io%2Feof-eos-validator%2Fschemas%2Feof-eos-schema-soft.json)\n" +
      `- [EOPF-EOS Metadata Schema](${defaultSchemaUrl})\n` +
      // The custom schema is built asynchronously: its link appears once it is ready.
      (customSchemaUrl ? `- [EOF-EOS Metadata Schema Modified](${customSchemaUrl})\n` : "") +
      `- [ISO 19115-4 Data Quality Metadata Schema (dqc.json)](${process.env.PUBLIC_URL}/schemas/dqc.json)\n` +
      `- [ISO 19115-4 Resource Lineage Metadata Schema (mdj.json)](${process.env.PUBLIC_URL}/schemas/mdj.json)`,
    [customSchemaUrl]);

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
        <div className="toolbar">
            <ExampleSelector onLoad={handleExample} />
            <div className="toolbar-settings">{settings?.name} {settings?.version}</div>
        </div>


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

      <MarkdownDocumentationPanel markdown={documentation} />
    </>
  );
}
