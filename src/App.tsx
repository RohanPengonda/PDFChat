import { useState, useEffect } from "react";
import { UploadZone } from "./components/UploadZone";
import { PDFViewer } from "./components/PDFViewer";
import { ChatInterface } from "./components/ChatInterface";
import { useChat, Source } from "./hooks/useChat";
import { api } from "./lib/api";
import { FileText, X, Settings } from "lucide-react";
import { clsx } from "clsx";

interface Document {
  id: string;
  filename: string;
  original_name: string;
}

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [highlightText, setHighlightText] = useState<string | undefined>(undefined);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    api.getDocuments().then(setDocuments).catch(console.error);
    api.createChat().then((chat) => setChatId(chat.id)).catch(console.error);
  }, []);

  const { messages, isLoading, streamingContent, sendMessage } = useChat(chatId);

  const handleUploadComplete = (doc: any) => {
    setDocuments((prev) => [doc, ...prev]);
    setSelectedDocId(doc.id);
  };

  const handleSourceClick = (source: Source) => {
    setSelectedDocId(source.document_id);
    setPageNumber(source.page_number);
    setHighlightText(source.text);
  };

  const handleDeleteDoc = async (docId: string) => {
    if (confirm("Delete this document?")) {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocId === docId) setSelectedDocId(null);
    }
  };

  const handleClearAll = async () => {
    if (confirm("Clear all documents?")) {
      await api.clearAllDocuments();
      setDocuments([]);
      setSelectedDocId(null);
    }
  };

  const fileUrl = selectedDocId ? `/api/documents/${selectedDocId}/content` : null;

  const bg = isDark ? "bg-[#12141f]" : "bg-[#f0f2f8]";
  const sidebar = isDark ? "bg-[#1a1d2e] border-[#2a2d3e]" : "bg-white border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const subtext = isDark ? "text-gray-400" : "text-gray-500";
  const border = isDark ? "border-[#2a2d3e]" : "border-gray-200";
  const docItem = isDark ? "hover:bg-[#2a2d3e] text-gray-300" : "hover:bg-gray-100 text-gray-700";
  const docSelected = isDark ? "bg-[#2a2d3e] text-white" : "bg-blue-50 text-blue-700";

  return (
    <div className={clsx("flex h-screen overflow-hidden font-sans", bg)}>

      {/* ── Left Sidebar ── */}
      <div className={clsx("w-[300px] flex-shrink-0 flex flex-col border-r", sidebar, border)}>

        {/* Logo */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className={clsx("font-bold text-lg tracking-tight", text)}>ChatPDF Q&A</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">

          {/* AI Model */}
          <div>
            <p className={clsx("text-[10px] font-semibold uppercase tracking-widest mb-2", subtext)}>AI Model</p>
            <div className={clsx("flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer", isDark ? "bg-[#0f1120] border-[#2a2d3e]" : "bg-gray-50 border-gray-200")}>
              <span className="text-blue-400 text-sm">✦</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className={clsx("flex-1 bg-transparent text-sm font-medium outline-none cursor-pointer", text)}
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>
          </div>

          {/* Upload */}
          <div>
            <p className={clsx("text-[10px] font-semibold uppercase tracking-widest mb-2", subtext)}>Upload Document</p>
            <UploadZone onUploadComplete={handleUploadComplete} isDark={isDark} />
            <p className={clsx("text-[11px] text-center mt-2", subtext)}>PDFs under 50MB</p>
          </div>

          {/* Documents */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className={clsx("text-[10px] font-semibold uppercase tracking-widest", subtext)}>Your Documents</p>
              {documents.length > 0 && (
                <button onClick={handleClearAll} className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition-colors">
                  Clear All
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              <p className={clsx("text-xs italic text-center py-3", subtext)}>No documents yet</p>
            ) : (
              <ul className="space-y-1">
                {documents.map((doc) => (
                  <li key={doc.id} className="group relative">
                    <button
                      onClick={() => { setSelectedDocId(doc.id); setPageNumber(1); setHighlightText(undefined); }}
                      className={clsx(
                        "w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-2.5 transition-all",
                        selectedDocId === doc.id ? docSelected : docItem
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                      <span className="truncate flex-1 font-medium">{doc.original_name}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Bottom icons */}
        <div className={clsx("px-5 py-4 border-t flex items-center justify-between", border)}>
          <button className={clsx("p-1.5 rounded-lg transition-colors", isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600")}>
            <Settings className="w-4 h-4" />
          </button>
          <div className={clsx("text-[10px] font-medium", subtext)}>v1.0</div>
        </div>
      </div>

      {/* ── Center: PDF Viewer ── */}
      <div className="flex-1 overflow-hidden">
        <PDFViewer fileUrl={fileUrl} pageNumber={pageNumber} highlightText={highlightText} isDark={isDark} />
      </div>

      {/* ── Right: Chat Panel ── */}
      <div className={clsx("w-[380px] flex-shrink-0 flex flex-col border-l", sidebar, border)}>
        <ChatInterface
          messages={messages}
          isLoading={isLoading}
          streamingContent={streamingContent}
          onSendMessage={(msg) =>
            sendMessage(msg, selectedDocId ? [selectedDocId] : documents.map((d) => d.id), selectedModel)
          }
          onSourceClick={handleSourceClick}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
        />
      </div>

    </div>
  );
}
