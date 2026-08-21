import { ErrorObject } from "ajv";
import {prettyPrint} from "../utils/jsonUtil";

export default function ErrorList({errors, title, color }:{
    errors: ErrorObject[] | undefined | null,
    title: string,
    color: "orange" | "red" } )
{

    return (
        <>
            <ul className="error-list">
                {errors!.map((error, j) => {
                    const hasSchemaPath = !!error.schemaPath;
                    const hasParams = !!error.params && Object.keys(error.params).length > 0;
                    return (
                        <li key={j} className={`error-item error-item-${color}`} >
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
                                            <pre>{prettyPrint(error.params)}</pre>
                                        </div>
                                    )}
                                </details>
                            )}
                        </li>
                    );
                })}
            </ul>
        </>
    );
}
