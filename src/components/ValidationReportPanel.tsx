import {ValidationReport} from "../services/ValidationResult";
import {prettyPrint} from "../utils/jsonUtil";
import ErrorList from "./ErrorList";

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
    const totalWarnings = report.results!.reduce((sum, item) => sum + (item.warnings?.length ?? 0), 0);

    return(
       <>
           {report.valid ? (
               <p className="result-title valid">{validTitle}</p>
           ): (
               <p className="result-title invalid">{invalidTitle}
                   ({totalErrors} error{totalErrors === 1 ? "" : "s"})
                   ({totalWarnings} warning{totalWarnings === 1 ? "" : "s"})</p>
           )}

           {report.results!.map((item, i) => (
               <div>
                   {item.valid ? (
                       <>
                           <div className={`result valid`}>
                            <p className="result-title valid">Valid - <SchemaLabel schema={item.schema} /></p>
                           </div>

                           {(item.warnings && item.warnings.length > 0) &&  (
                               <div className={`result warning`}>
                                   <p className="result-title">Warning - <SchemaLabel schema={item.schema} /></p>
                                   <ErrorList errors={item.warnings} title="warnings" color="orange"></ErrorList>
                               </div>
                           )}
                       </>
                   ) : (
                   <>

                       {(item.errors && item.errors.length > 0) &&  (
                       <div className={`result invalid`}>
                           <p className="result-title">Errors - <SchemaLabel schema={item.schema} /></p>
                           <ErrorList errors={item.errors} title="errors" color="red"></ErrorList>
                       </div>
                       )}

                       {(item.warnings && item.warnings.length > 0) &&  (
                           <div className={`result warning`}>
                               <p className="result-title">Warning - <SchemaLabel schema={item.schema} /></p>
                               <ErrorList errors={item.warnings} title="warnings" color="orange"></ErrorList>
                           </div>
                       )}


                   </>
                   )}
               </div>


           ))}
       </>
    );
}