import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { clsx } from "clsx";

interface UploadZoneProps {
  onUploadComplete: (doc: { id: string; filename: string }) => void;
  isDark?: boolean;
}

export function UploadZone({ onUploadComplete, isDark = true }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await uploadFile(files[0]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) await uploadFile(e.target.files[0]);
  };

  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf") { alert("Only PDF files are supported"); return; }
    setIsUploading(true);
    try {
      const doc = await api.uploadFile(file);
      onUploadComplete(doc);
    } catch {
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      onClick={() => !isUploading && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-medium text-sm transition-all cursor-pointer select-none",
        isDragging
          ? "bg-blue-500/20 border-2 border-dashed border-blue-400 text-blue-300"
          : isDark
            ? "bg-[#2a3a5c] hover:bg-[#2f4268] text-white border border-[#3a4f7a]"
            : "bg-blue-600 hover:bg-blue-700 text-white",
        isUploading && "opacity-70 cursor-not-allowed"
      )}
    >
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} disabled={isUploading} />
      {isUploading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Processing…</span>
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" />
          <span>Add Document</span>
        </>
      )}
    </div>
  );
}
