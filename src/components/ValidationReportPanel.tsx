import {ValidationReport} from "../utils/ValidationResult";


export default function ValidationReportPanel({report }:{report: ValidationReport} ){

    return(
        <>
            <div className={`result ${report.valid ? "valid" : "invalid"}`}>
                {report.valid ? (
                    <p className="result-title">Valid — the file conforms to the schema.</p>
                ) : (
                    <>
                        {report.results!.map((item, i) => (
                            <div key={i} className="result-item">
                                {!item.valid && (
                                <>
                                <p className="result-title result.invalid">Invalid - {item.schema}</p>

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
                )}
            </div>
        </>
    );
}