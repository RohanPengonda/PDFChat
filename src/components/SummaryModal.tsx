import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { clsx } from "clsx";

interface SummaryModalProps {
  docName: string;
  content: string;
  isDark: boolean;
  onClose: () => void;
}

export function SummaryModal({ docName, content, isDark, onClose }: SummaryModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modalBg = isDark ? "bg-[#1a1d2e] border-[#2a2d3e]" : "bg-white border-gray-200";
  const headerBorder = isDark ? "border-[#2a2d3e]" : "border-gray-200";
  const titleColor = isDark ? "text-white" : "text-gray-900";
  const subColor = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[85vh] rounded-2xl border border-gray-200 shadow-2xl flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg">📋</span>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm text-gray-900">Document Summary</h2>
              <p className="text-[11px] truncate mt-0.5 text-gray-500">{docName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-gray-100 hover:bg-gray-200 text-gray-600"
              title="Copy summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
