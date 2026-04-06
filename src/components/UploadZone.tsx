import { useState, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { api } from "../lib/api";
import { clsx } from "clsx";

interface UploadZoneProps {
  onUploadComplete: (doc: { id: string; filename: string }) => void;
  isDark?: boolean;
}

export function UploadZone({ onUploadComplete, isDark = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
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
    } catch { alert("Failed to upload file"); }
    finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const base = isDark
    ? "bg-[#2979ff] hover:bg-[#1565c0] text-white"
    : "bg-[#b5651d] hover:bg-[#9e5519] text-white";

  return (
    <div
      onClick={() => !isUploading && fileInputRef.current?.click()}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={clsx(
        "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none",
        isDragging ? "opacity-70 scale-95" : "",
        isUploading ? "opacity-60 cursor-not-allowed" : "",
        base
      )}
    >
      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} disabled={isUploading} />
      {isUploading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Processing…</span></> : <><Upload className="w-3.5 h-3.5" /><span>Add Document</span></>}
    </div>
  );
}
