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

  const bg = isDark ? "bg-[#1e2433] border-[#2d3548] text-[#e8eaf0]" : "bg-white border-gray-200";
  const textMain = isDark ? "text-[#e8eaf0]" : "text-gray-900";
  const textSub = isDark ? "text-[#6b7a99]" : "text-gray-500";
  const copyBtn = isDark
    ? "bg-[#252d40] border border-[#2d3548] text-[#a0b0cc] hover:bg-[#2d3548] hover:text-white"
    : "bg-gray-100 hover:bg-gray-200 text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={clsx("relative w-full max-w-2xl max-h-[85dvh] rounded-2xl border shadow-2xl flex flex-col", bg)}>
        {/* Header */}
        <div className={clsx("flex items-center justify-between px-5 py-4 border-b flex-shrink-0", isDark ? "border-[#2d3548]" : "border-gray-200")}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg">📋</span>
            <div className="min-w-0">
              <h2 className={clsx("font-semibold text-sm", textMain)}>Document Summary</h2>
              <p className={clsx("text-[11px] truncate mt-0.5", textSub)}>{docName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 ml-3">
            <button
              onClick={handleCopy}
              className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all", copyBtn)}
              title="Copy summary"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={onClose}
              className={clsx("p-2 rounded-lg transition-colors", isDark ? "text-[#6b7a99] hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className={clsx("prose prose-sm max-w-none", isDark ? "prose-invert text-[#e8eaf0]" : "text-[#2c2416]")}>
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
