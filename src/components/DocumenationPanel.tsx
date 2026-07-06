
export default function DocumentationPanel(){

    let links : DocumentationLink[] = [];
    links.push({title: "EO Metadata", href: `https://eof-eos.io.esa.int/eopf-eos/data-model/6-metadata.html`});
    links.push({title: "EOF-EOS Schema", href: `${process.env.PUBLIC_URL}/schemas/eof-eos-schema.json`});
    links.push({title: "DQC Schema", href: `${process.env.PUBLIC_URL}/schemas/dqc.json`});
    links.push({title: "MDJ Schema", href: `${process.env.PUBLIC_URL}/schemas/mdj.json`});


    const documentationLinks = links.map(link =>
        <li><a title={link.title} href={link.href} target="_blank">{link.title}</a></li>
    );

    return(
        <>
            <h2>Documentation</h2>
           <ul>{documentationLinks}</ul>
        </>
    );
}

export interface DocumentationLink {
    title: string;
    href: string;
}