import { useState, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { clsx } from 'clsx';

interface UploadZoneProps {
  onUploadComplete: (doc: { id: string; filename: string }) => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are supported');
      return;
    }

    setIsUploading(true);
    try {
      const doc = await api.uploadFile(file);
      onUploadComplete(doc);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div 
      className={clsx(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
        isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
        isUploading ? "opacity-50 cursor-not-allowed" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".pdf" 
        onChange={handleFileSelect}
        disabled={isUploading}
      />
      
      <div className="flex flex-col items-center gap-2 text-gray-500">
        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Processing PDF...</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8" />
            <p className="text-sm font-medium">Click to upload or drag & drop</p>
            <p className="text-xs text-gray-400">PDF files only</p>
          </>
        )}
      </div>
    </div>
  );
}
