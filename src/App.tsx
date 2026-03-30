import { useState, useEffect } from "react";
import { UploadZone } from "./components/UploadZone";
import { PDFViewer } from "./components/PDFViewer";
import { ChatInterface } from "./components/ChatInterface";
import { useChat, Source } from "./hooks/useChat";
import { api } from "./lib/api";
import { FileText, X, Settings, Menu, FileSearch, MessageSquare } from "lucide-react";
import { clsx } from "clsx";

interface Document {
  id: string;
  filename: string;
  original_name: string;
}

type MobileTab = "sidebar" | "pdf" | "chat";

export default function App() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [highlightText, setHighlightText] = useState<string | undefined>(undefined);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [isDark, setIsDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false); // tablet overlay
  const [mobileTab, setMobileTab] = useState<MobileTab>("pdf");

  useEffect(() => {
    api.getDocuments().then(setDocuments).catch(console.error);
    api.createChat().then((chat) => setChatId(chat.id)).catch(console.error);
  }, []);

  const { messages, isLoading, streamingContent, sendMessage } = useChat(chatId);

  const handleUploadComplete = (doc: any) => {
    setDocuments((prev) => [doc, ...prev]);
    setSelectedDocId(doc.id);
    setMobileTab("pdf");
    setSidebarOpen(false);
  };

  const handleSourceClick = (source: Source) => {
    setSelectedDocId(source.document_id);
    setPageNumber(source.page_number);
    setHighlightText(source.text);
    setMobileTab("pdf");
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

  // Theme tokens
  const bg = isDark ? "bg-[#12141f]" : "bg-[#f0f2f8]";
  const panel = isDark ? "bg-[#1a1d2e] border-[#2a2d3e]" : "bg-white border-gray-200";
  const text = isDark ? "text-white" : "text-gray-900";
  const subtext = isDark ? "text-gray-400" : "text-gray-500";
  const border = isDark ? "border-[#2a2d3e]" : "border-gray-200";
  const docItem = isDark ? "hover:bg-[#2a2d3e] text-gray-300" : "hover:bg-gray-100 text-gray-700";
  const docSelected = isDark ? "bg-[#2a2d3e] text-white" : "bg-blue-50 text-blue-700";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
            <FileText className="w-4 h-4 text-white" />
          </div>
          <span className={clsx("font-bold text-lg tracking-tight", text)}>ChatPDF Q&A</span>
        </div>
        {/* Close button for tablet overlay */}
        <button
          onClick={() => setSidebarOpen(false)}
          className={clsx("lg:hidden p-1.5 rounded-lg", subtext, "hover:text-white")}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
        {/* AI Model */}
        <div>
          <p className={clsx("text-[10px] font-semibold uppercase tracking-widest mb-2", subtext)}>AI Model</p>
          <div className={clsx("flex items-center gap-2 px-3 py-2.5 rounded-xl border", isDark ? "bg-[#0f1120] border-[#2a2d3e]" : "bg-gray-50 border-gray-200")}>
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
                    onClick={() => {
                      setSelectedDocId(doc.id);
                      setPageNumber(1);
                      setHighlightText(undefined);
                      setMobileTab("pdf");
                      setSidebarOpen(false);
                    }}
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

      {/* Bottom */}
      <div className={clsx("px-5 py-4 border-t flex items-center justify-between", border)}>
        <button className={clsx("p-1.5 rounded-lg transition-colors", subtext, "hover:text-white")}>
          <Settings className="w-4 h-4" />
        </button>
        <div className={clsx("text-[10px] font-medium", subtext)}>v1.0</div>
      </div>
    </div>
  );

  return (
    <div className={clsx("flex h-screen overflow-hidden font-sans", bg)}>

      {/* ── DESKTOP: Fixed left sidebar (lg+) ── */}
      <div className={clsx("hidden lg:flex flex-col w-[300px] flex-shrink-0 border-r", panel, border)}>
        <SidebarContent />
      </div>

      {/* ── TABLET/MOBILE: Sidebar overlay ── */}
      {sidebarOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className={clsx(
            "lg:hidden fixed left-0 top-0 h-full w-[280px] z-40 flex flex-col border-r shadow-2xl",
            panel, border
          )}>
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── MAIN AREA ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── TABLET header bar (md, hidden on lg+) ── */}
        <div className={clsx(
          "hidden md:flex lg:hidden items-center justify-between px-4 py-3 border-b flex-shrink-0",
          panel, border
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className={clsx("p-2 rounded-lg transition-colors", subtext, "hover:text-white")}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className={clsx("font-bold text-sm", text)}>ChatPDF Q&A</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className={clsx("text-xs px-3 py-1.5 rounded-lg border transition-colors", border, subtext, "hover:text-white")}
            >
              + Upload
            </button>
          </div>
        </div>

        {/* ── TABLET: PDF + Chat side by side ── */}
        <div className="hidden md:flex lg:hidden flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <PDFViewer fileUrl={fileUrl} pageNumber={pageNumber} highlightText={highlightText} isDark={isDark} />
          </div>
          <div className={clsx("w-[340px] flex-shrink-0 border-l flex flex-col", panel, border)}>
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              streamingContent={streamingContent}
              onSendMessage={(msg) => sendMessage(msg, selectedDocId ? [selectedDocId] : documents.map((d) => d.id), selectedModel)}
              onSourceClick={handleSourceClick}
              isDark={isDark}
              onToggleTheme={() => setIsDark(!isDark)}
            />
          </div>
        </div>

        {/* ── MOBILE: Single panel view with tab bar ── */}
        <div className="flex md:hidden flex-1 flex-col overflow-hidden">
          {/* Mobile top bar */}
          <div className={clsx("flex items-center justify-between px-4 py-3 border-b flex-shrink-0", panel, border)}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5 text-white" />
              </div>
              <span className={clsx("font-bold text-sm", text)}>ChatPDF Q&A</span>
            </div>
            <button
              onClick={() => setIsDark(!isDark)}
              className={clsx("p-2 rounded-lg", subtext)}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>

          {/* Active panel */}
          <div className="flex-1 overflow-hidden">
            {mobileTab === "sidebar" && (
              <div className={clsx("h-full overflow-y-auto", panel)}>
                <SidebarContent />
              </div>
            )}
            {mobileTab === "pdf" && (
              <PDFViewer fileUrl={fileUrl} pageNumber={pageNumber} highlightText={highlightText} isDark={isDark} />
            )}
            {mobileTab === "chat" && (
              <div className={clsx("h-full flex flex-col", panel)}>
                <ChatInterface
                  messages={messages}
                  isLoading={isLoading}
                  streamingContent={streamingContent}
                  onSendMessage={(msg) => sendMessage(msg, selectedDocId ? [selectedDocId] : documents.map((d) => d.id), selectedModel)}
                  onSourceClick={handleSourceClick}
                  isDark={isDark}
                  onToggleTheme={() => setIsDark(!isDark)}
                />
              </div>
            )}
          </div>

          {/* Mobile bottom tab bar */}
          <div className={clsx("flex-shrink-0 border-t flex items-center", panel, border)}>
            {([
              { tab: "sidebar" as MobileTab, icon: Menu, label: "Docs" },
              { tab: "pdf" as MobileTab, icon: FileSearch, label: "PDF" },
              { tab: "chat" as MobileTab, icon: MessageSquare, label: "Chat" },
            ] as const).map(({ tab, icon: Icon, label }) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors",
                  mobileTab === tab
                    ? "text-blue-400"
                    : subtext
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
                {tab === "chat" && messages.length > 0 && mobileTab !== "chat" && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── DESKTOP: PDF + Chat (lg+) ── */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <PDFViewer fileUrl={fileUrl} pageNumber={pageNumber} highlightText={highlightText} isDark={isDark} />
          </div>
          <div className={clsx("w-[380px] flex-shrink-0 border-l flex flex-col", panel, border)}>
            <ChatInterface
              messages={messages}
              isLoading={isLoading}
              streamingContent={streamingContent}
              onSendMessage={(msg) => sendMessage(msg, selectedDocId ? [selectedDocId] : documents.map((d) => d.id), selectedModel)}
              onSourceClick={handleSourceClick}
              isDark={isDark}
              onToggleTheme={() => setIsDark(!isDark)}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
