import { useContext } from "react";
import { JsonFileContext } from "../App";
import Editor from "@monaco-editor/react";

export default function ConverterPage() {
  const { content } = useContext(JsonFileContext)!;

  return (
    <div className="page-placeholder">
        Coming soon.
      {/*{content ? (*/}
      {/*  <div className="upload-paste-area">*/}
      {/*    <Editor*/}
      {/*      height="650px"*/}
      {/*      language="json"*/}
      {/*      value={JSON.stringify(content, null, 2)}*/}
      {/*      options={{*/}
      {/*        readOnly: true,*/}
      {/*        minimap: { enabled: false },*/}
      {/*        scrollBeyondLastLine: false,*/}
      {/*        tabSize: 2,*/}
      {/*      }}*/}
      {/*    />*/}
      {/*  </div>*/}
      {/*) : (*/}
      {/*  <p>No JSON loaded yet. Upload or paste a file first.</p>*/}
      {/*)}*/}
    </div>
  );
}
