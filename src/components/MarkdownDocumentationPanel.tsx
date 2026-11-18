import { memo } from "react";
import Markdown, { Components, defaultUrlTransform } from "react-markdown";

// react-markdown drops the URLs it considers unsafe, blob: included. Blob URLs are
// created by the page itself (e.g. the custom schema), so they are kept as they are.
function urlTransform(url: string): string {
    return url.startsWith("blob:") ? url : defaultUrlTransform(url);
}

const components: Components = {
    // Open links in a new tab, consistent with DocumentationPanel
    a: ({node, ...props}) => (
        <a {...props} className="documentation-link" target="_blank" rel="noreferrer"/>
    ),
};

interface MarkdownDocumentationPanelProps {
    markdown: string;
}

// memo: the markdown is parsed again only when its text changes, not on every
// render of the parent page.
function MarkdownDocumentationPanel({markdown}: MarkdownDocumentationPanelProps) {
    return (
        <div className="markdown-documentation-panel">
            <Markdown urlTransform={urlTransform} components={components}>
                {markdown}
            </Markdown>
        </div>
    );
}

export default memo(MarkdownDocumentationPanel);
