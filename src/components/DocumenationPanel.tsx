export default function DocumentationPanel(){

    return(
        <>
            <h2>Documentation</h2>
           {/*<ul>{documentationResources}</ul>*/}
            <ul>
                {/*EO Metadata documentation*/}
                <li> <a className="documentation-link" title="EO Metadata" href="https://eof-eos.io.esa.int/eopf-eos/data-model/6-metadata.html" target="_blank" rel="noreferrer">EO Metadata</a></li>

                {/*EOF-EOS Schema Documentation*/}
                <li> <a className="documentation-link" title="EOF-EOS Schema Documentation"
                        href="https://json-schema.app/view/%23?url=https%3A%2F%2Feovoc.github.io%2Feof-eos-validator%2Fschemas%2Feof-eos-schema.json"
                        target="_blank" rel="noreferrer">EOF-EOS Schema Documentation</a>
                </li>
            </ul>

            <h2>Schemas</h2>
            <ul>
                {/*EOF-EOS Schema*/}
                <li> <a className="documentation-link" title="EOF-EOS Schema" href={`${process.env.PUBLIC_URL}/schemas/eof-eos-schema.json`} target="_blank" rel="noreferrer">EOF-EOS Schema</a></li>

                {/*ISO19115-4 Schemas*/}
                <li>
                    ISO19115-4 (
                        <a className="documentation-link" title="dqc.json" href={`${process.env.PUBLIC_URL}/schemas/dqc.json`} target="_blank" rel="noreferrer">dqc.json</a>
                    and
                    <a className="documentation-link" style={{ marginLeft: "0.25em" }} title="mdj.json" href={`${process.env.PUBLIC_URL}/schemas/mdj.json`} target="_blank" rel="noreferrer">mdj.json</a>
                    schemas)
                </li>

            </ul>
        </>
    );
}