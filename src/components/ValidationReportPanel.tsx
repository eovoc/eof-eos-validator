import {ValidationReport} from "../utils/ValidationResult";


export default function ValidationReportPanel({report, validTitle, invalidTitle }:{
    report: ValidationReport,
    validTitle: string,
    invalidTitle: string } )
{

    return(
       <>
           {report.valid ? (
               <p className="result-title valid">Valid STAC Item</p>
           ): (
               <p className="result-title invalid">Invalid STAC Item</p>
           )}

           {report.results!.map((item, i) => (
               <div key={i} className={`result ${item.valid ? "valid" : "invalid"}`}>
                   {item.valid ? (
                   <p className="result-title">Valid - {item.schema}</p>
                   ) : (
                   <>
                   <p className="result-title">Invalid - {item.schema}</p>

                   <ul className="error-list">
                       {item.errors!.map((error, j) => (
                       <li key={j} className="error-item">
                           <span className="error-path">{error.instancePath}</span>
                           <span className="error-msg">{error.message}</span>
                       </li>
                       ))}
                   </ul>
                   </>
                   )}
               </div>

           ))}
       </>
    );
}