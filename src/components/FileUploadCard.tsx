function FileUploadCard({
  label,
  hint,
  icon,
  file,
  onFile,
  accept,
}: {
  label: string;
  hint: string;
  icon: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept: string;
}) {
  return (
    <div className={`upload-card ${file ? "has-file" : ""}`}>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <div className="upload-icon">{icon}</div>
      <div className="upload-label">{label}</div>
      <div className="upload-hint">{hint}</div>
      {file && <div className="file-name">{file.name}</div>}
    </div>
  );
}

export default FileUploadCard;
