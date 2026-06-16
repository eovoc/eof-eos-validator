import { useState } from "react";

function useJsonFile() {
  const [file, setFile] = useState<File | null>(null);
  const [content, setContent] = useState<unknown>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function handleFile(f: File | null) {
    setFile(f);
    setContent(null);
    setParseError(null);
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setContent(JSON.parse(e.target!.result as string));
      } catch {
        setParseError(`"${f.name}" is not valid JSON.`);
      }
    };
    reader.readAsText(f);
  }

  function handleText(text: string) {
    setFile(null);
    setParseError(null);
    if (!text.trim()) {
      setContent(null);
      return;
    }
    try {
      setContent(JSON.parse(text));
    } catch {
      setContent(null);
      setParseError("Pasted text is not valid JSON.");
    }
  }

  return { file, content, parseError, handleFile, handleText };
}

export default useJsonFile;
