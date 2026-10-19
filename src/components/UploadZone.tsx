import { useState, useRef } from "react";
import { Upload, Loader2, RotateCw } from "lucide-react";
import { api } from "../lib/api";
import { useToast } from "./Toast";
import { clsx } from "clsx";

interface UploadZoneProps {
  onUploadComplete: (doc: { id: string; filename: string; original_name: string }) => void;
  isDark?: boolean;
}

export function UploadZone({ onUploadComplete, isDark = false }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const toast = useToast();

  const MAX_RETRIES = 3;

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

  const resetUploadState = () => {
    setUploadProgress(0);
    setUploadError(null);
    setRetryCount(0);
    abortControllerRef.current = null;
  };

  const uploadFile = async (file: File) => {
    if (file.type !== "application/pdf") { toast("Only PDF files are supported.", "error"); return; }
    resetUploadState();
    setIsUploading(true);

    try {
      const doc = await uploadWithProgress(file, 0);
      onUploadComplete(doc);
      setUploadError(null);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload file.");
      toast(err?.message || "Failed to upload file.", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const uploadWithProgress = (file: File, attempt: number): Promise<any> => {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      const token = api.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        abortControllerRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Invalid server response'));
          }
        } else {
          let message = `Upload failed (HTTP ${xhr.status})`;
          try {
            const data = JSON.parse(xhr.responseText);
            if (data && typeof data.error === 'string') message = data.error;
          } catch {}
          handleUploadError(message, attempt, file, resolve, reject);
        }
      });

      xhr.addEventListener('error', () => {
        abortControllerRef.current = null;
        handleUploadError('Network error during upload.', attempt, file, resolve, reject);
      });

      xhr.addEventListener('abort', () => {
        abortControllerRef.current = null;
        reject(new Error('Upload cancelled'));
      });

      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  };

  const handleUploadError = (message: string, attempt: number, file: File, resolve: any, reject: any) => {
    if (attempt < MAX_RETRIES) {
      setRetryCount(attempt + 1);
      // Retry after a short delay
      setTimeout(() => {
        setUploadProgress(0);
        uploadWithProgress(file, attempt + 1).then(resolve).catch(reject);
      }, 1000 * (attempt + 1));
    } else {
      setUploadError(message);
      reject(new Error(message));
    }
  };

  const handleRetry = () => {
    const fileInput = fileInputRef.current;
    if (!fileInput?.files?.length) return;
    setUploadError(null);
    setRetryCount(0);
    uploadFile(fileInput.files[0]);
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
      )}>

      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileSelect} disabled={isUploading} />

      {uploadError && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mb-1">
          <RotateCw className="w-3 h-3" /> {uploadError}
          <button
            onClick={handleRetry}
            disabled={isUploading || retryCount >= MAX_RETRIES}
            className="ml-2 underline hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {isUploading ? (
        <>
          <div className="flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Processing…</span>
          </div>
          {uploadProgress > 0 && (
            <div className="w-full bg-[#e4ddd4] rounded-full h-[4px] mt-2 dark:bg-[#2d3548]">
              <div
                className="bg-[#b5651d] h-[4px] rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          {retryCount > 0 && (
            <p className="text-[10px] text-[#8a7d6b] mt-1 dark:text-[#6b7a99]">
              Retrying ({retryCount}/{MAX_RETRIES})…
            </p>
          )}
        </>
      ) : (
        <>
          <Upload className="w-3.5 h-3.5" /><span>Add Document</span>
        </>
      )}
    </div>
  );
}
