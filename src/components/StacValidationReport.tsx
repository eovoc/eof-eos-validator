import { StacReport } from "../services/stacValidator";
import { ValidationResult } from "../services/ValidationResult";
import { schemaLabel } from "../utils/stacSchemaLabel";
import ErrorList from "./ErrorList";

// Validation report of the STAC page, laid out like the one of STAC Browser:
// a notice, the id and overall result, then one card per schema (core schema
// first, then each extension listed in "stac_extensions").

function SchemaCard({ result, type, stacVersion }: Readonly<{
  result: ValidationResult;
  type: string | null;
  stacVersion: string | null;
}>) {
  const label = schemaLabel(result.schema, type, stacVersion);
  const errors = result.errors ?? [];

  return (
    <section className="stac-card">
      <header className="stac-card-header" title={result.schema}>
        {label.extension
          ? <code className="stac-card-name">{label.name}</code>
          : <span className="stac-card-name">{label.name}</span>}
        {label.version && <span className="stac-badge stac-badge-version">{label.version}</span>}
        {label.extension && <span className="stac-badge stac-badge-extension">Extension</span>}
      </header>

      {result.valid ? (
        <div className="stac-card-body valid">Valid</div>
      ) : (
        <div className="stac-card-body invalid">
          <p className="stac-card-status">
            Invalid ({errors.length} error{errors.length === 1 ? "" : "s"})
          </p>
          {errors.length > 0 && <ErrorList errors={errors} title="errors" color="red" />}
        </div>
      )}
    </section>
  );
}

export default function StacValidationReport({ report }: Readonly<{ report: StacReport }>) {
  return (
    <div className="stac-report">
      <p className="stac-report-notice">
        This report is based on JSON schemas, which do not cover every rule of the STAC specification
        and its extensions. A valid result does not guarantee that the STAC object fully complies with them.
      </p>

      <dl className="stac-report-summary">
        <dt>ID</dt>
        <dd><code>{report.id ?? "(unknown)"}</code></dd>
        <dt>Result</dt>
        <dd className={report.valid ? "valid" : "invalid"}>{report.valid ? "Valid" : "Invalid"}</dd>
      </dl>

      <div className="stac-report-grid">
        {report.results.map((result) => (
          <SchemaCard key={result.schema}
                      result={result}
                      type={report.type}
                      stacVersion={report.stacVersion} />
        ))}
      </div>
    </div>
  );
}
