import { useEffect, useState } from "react";
import { THESAURUS_DIR, loadThesaurusSchemaFiles } from "../utils/thesaurusSchemas";

export default function DocumentationPanel(){
    const [thesaurusFiles, setThesaurusFiles] = useState<string[]>([]);

    useEffect(() => {
        loadThesaurusSchemaFiles().then(setThesaurusFiles);
    }, []);

    return(
        <>
            <h2>Documentation</h2>
           {/*<ul>{documentationResources}</ul>*/}
            <ul>
                {/*EO Metadata documentation*/}
                <li> <a className="documentation-link" title="EO Metadata" href="https://eof-eos.io.esa.int/eopf-eos/data-model/6-metadata.html" target="_blank" rel="noreferrer">EO Metadata</a></li>

                {/*EOF-EOS Schema documentation*/}
                <li> <a className="documentation-link" title="EOF-EOS Schema" href={`${process.env.PUBLIC_URL}/schemas/eof-eos-schema.json`} target="_blank" rel="noreferrer">EOF-EOS Schema</a></li>

                {/*ISO19115-4 documentation*/}
                <li>
                    ISO19115-4 (
                        <a className="documentation-link" title="dqc.json" href={`${process.env.PUBLIC_URL}/schemas/dqc.json`} target="_blank" rel="noreferrer">dqc.json</a>
                    and
                    <a className="documentation-link" style={{ marginLeft: "0.25em" }} title="mdj.json" href={`${process.env.PUBLIC_URL}/schemas/mdj.json`} target="_blank" rel="noreferrer">mdj.json</a>
                    schemas)
                </li>

                {/*Thesaurus schemas*/}
                <li> Thesaurus (
                {thesaurusFiles.map((file) => (
                     <a className="documentation-link" style={{ marginLeft: "0.25em" }}title={file} href={`${THESAURUS_DIR}/${file}`} target="_blank" rel="noreferrer">{file}</a>
                ))}
                )</li>
            </ul>
        </>
    );
}