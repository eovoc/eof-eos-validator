import {DocumentationSection} from "../types/DocumentationSection";

interface DocumentationPanelProps {
    sections: DocumentationSection[];
}

export default function DocumentationPanel(documentation: DocumentationPanelProps){

    return(
        <>
            {documentation!.sections.map((section, i) => (
                <div key={i}>
                    <h2>{section.title}</h2>
                    <ul>
                        {section.links!.map((link, j) => (
                            <li key={j}>
                                <a className="documentation-link"
                                   title={link.name}
                                   href={link.href}
                                   target="_blank"
                                   rel="noreferrer">{link.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </>
    );
}