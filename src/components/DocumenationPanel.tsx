
export default function DocumentationPanel(){

    let resources : DocumentationResource[] = [];
    //EO Metadata documentation
    const metadataLink : Link = {title: "EO Metadata", href: `https://eof-eos.io.esa.int/eopf-eos/data-model/6-metadata.html`};
    resources.push({links: [metadataLink]});

    //EOF-EOS Schema documentation
    const schemaLink = {title: "EOF-EOS Schema", href: `${process.env.PUBLIC_URL}/schemas/eof-eos-schema.json`};
    resources.push({links: [schemaLink]});

    //ISO19115-4 documentation
    const dqcSchemaLink = {title: "DQC Schema", href: `${process.env.PUBLIC_URL}/schemas/dqc.json`};
    const mdjSchemaLink = {title: "MDJ Schema", href: `${process.env.PUBLIC_URL}/schemas/mdj.json`};
    resources.push({name: "ISO19115-4", links:[dqcSchemaLink,mdjSchemaLink]});

    const documentationResources = resources.map(resource =>
        <li>
            {resource.name && <>{resource.name}: </>}
            {resource.links.map(link =>
                <a className="documentation-link" title={link.title} href={link.href} target="_blank" rel="noreferrer">{link.title}</a>)}
        </li>
    );

    return(
        <>
            <h2>Documentation</h2>
           <ul>{documentationResources}</ul>
        </>
    );
}

export interface DocumentationResource {
    name?: string;
    links: Link[];
}

export interface Link {
    title: string;
    href: string;
}