import {ValidationReport} from "../utils/ValidationResult";

function SchemaLabel({schema}:{schema: string}) {
    if (schema.startsWith("http") || schema.startsWith(process.env.PUBLIC_URL)) {
        //If schema is hosted locally: the filename is used as the label. Otherwise: the full URL is used.
        const label = schema.startsWith(process.env.PUBLIC_URL)
            ? schema.split("/").filter(Boolean).pop()
            : schema;
        return <a href={schema} target="_blank" rel="noopener noreferrer">{label}</a>;
    }
    return <>{schema}</>;
}

export default function ValidationReportPanel({report, validTitle, invalidTitle }:{
    report: ValidationReport,
    validTitle: string,
    invalidTitle: string } )
{

    const totalErrors = report.results!.reduce((sum, item) => sum + (item.errors?.length ?? 0), 0);

    return(
       <>
           {report.valid ? (
               <p className="result-title valid">{validTitle}</p>
           ): (
               <p className="result-title invalid">{invalidTitle} ({totalErrors} error{totalErrors === 1 ? "" : "s"})</p>
           )}

           {report.results!.map((item, i) => (
               <div key={i} className={`result ${item.valid ? "valid" : "invalid"}`}>
                   {item.valid ? (
                   <p className="result-title">Valid - <SchemaLabel schema={item.schema} /></p>
                   ) : (
                   <>
                   <p className="result-title">Invalid - <SchemaLabel schema={item.schema} /></p>

                   <ul className="error-list">
                       {item.errors!.map((error, j) => {
                       const hasSchemaPath = !!error.schemaPath;
                       const hasParams = !!error.params && Object.keys(error.params).length > 0;
                       return (
                       <li key={j} className="error-item">
                           <span className="error-path">{error.instancePath}</span>
                           <span className="error-msg">{error.message}</span>
                           {(hasSchemaPath || hasParams) && (
                           <details className="error-details">
                               <summary>Details</summary>
                               {hasSchemaPath && (
                               <div className="error-detail-row">
                                   <span className="error-detail-label">schemaPath:</span>
                                   <code>{error.schemaPath}</code>
                               </div>
                               )}
                               {hasParams && (
                               <div className="error-detail-row">
                                   <span className="error-detail-label">params:</span>
                                   <pre>{JSON.stringify(error.params, null, 2)}</pre>
                               </div>
                               )}
                           </details>
                           )}
                       </li>
                       );
                       })}
                   </ul>
                   </>
                   )}
               </div>

           ))}
       </>
    );
}