import Markdown from "react-markdown";

interface MarkdownDocumentationPanelProps {
    markdown: string;
}

export default function MarkdownDocumentationPanel({markdown}: MarkdownDocumentationPanelProps) {
    return (
        <div className="markdown-documentation-panel">
            <Markdown
                components={{
                    // Open links in a new tab, consistent with DocumentationPanel
                    a: ({node, ...props}) => (
                        <a {...props} className="documentation-link" target="_blank" rel="noreferrer"/>
                    ),
                }}
            >
                {markdown}
            </Markdown>
        </div>
    );
}
