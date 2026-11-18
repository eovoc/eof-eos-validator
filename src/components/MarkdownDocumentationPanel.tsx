import { memo } from "react";
import Markdown, { Components, defaultUrlTransform } from "react-markdown";

// JSON data: URLs, built by the page itself (e.g. the custom schema).
const JSON_DATA_URL = "data:application/json";

// react-markdown drops the URLs it considers unsafe, data: included. JSON data: URLs
// are kept; other data: types (e.g. text/html) are still dropped.
function urlTransform(url: string): string {
    return url.startsWith(JSON_DATA_URL) ? url : defaultUrlTransform(url);
}

const components: Components = {
    // Open links in a new tab. Browsers block opening a data: URL from a link,
    // but allow downloading it: data: links download the file instead.
    a: ({node, ...props}) =>
        props.href?.startsWith(JSON_DATA_URL) ? (
            <a {...props} className="documentation-link" download={`${typeof props.children === "string" ? props.children : "schema"}.json`}/>
        ) : (
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
