import { useState, useEffect } from "react";
import { UploadZone } from "./components/UploadZone";
import { PDFViewer } from "./components/PDFViewer";
import { ChatInterface } from "./components/ChatInterface";
import { SummaryModal } from "./components/SummaryModal";
import { useChat, Source } from "./hooks/useChat";
import { api } from "./lib/api";
import {
  X,
  Menu,
  FileSearch,
  MessageSquare,
  Loader2,
  ClipboardList,
  Moon,
  Sun,
} from "lucide-react";
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
  const [highlightText, setHighlightText] = useState<string | undefined>(
    undefined,
  );
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [isDark, setIsDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [summary, setSummary] = useState<{
    docName: string;
    content: string;
  } | null>(null);
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);

  useEffect(() => {
    api.getDocuments().then(setDocuments).catch(console.error);
    api
      .createChat()
      .then((chat) => setChatId(chat.id))
      .catch(console.error);
  }, []);

  const {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    suggestions,
    setSuggestions,
  } = useChat(chatId);

  const handleUploadComplete = async (doc: any) => {
    setDocuments((prev) => [doc, ...prev]);
    setSelectedDocId(doc.id);
    setSidebarOpen(false);
    try {
      const content = await api.getDocumentSummary(doc.id);
      setSummary({ docName: doc.original_name || doc.filename, content });
    } catch (e) {
      console.error("Summary failed:", e);
    }
  };

  const handleSummaryClick = async (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    setSummaryLoadingId(doc.id);
    setSidebarOpen(false);
    try {
      const content = await api.getDocumentSummary(doc.id);
      setSummary({ docName: doc.original_name, content });
    } catch {
      setSummary({
        docName: doc.original_name,
        content: "Failed to generate summary.",
      });
    } finally {
      setSummaryLoadingId(null);
    }
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

  const fileUrl = selectedDocId
    ? `/api/documents/${selectedDocId}/content`
    : null;

  // ── Theme tokens matching reference ──
  const L = {
    app: "bg-[#ede8e0]",
    sidebar: "bg-[#ede8e0]",
    sidebarBorder: "border-[#d8d0c4]",
    chat: "bg-[#f7f4f0]",
    text: "text-[#2c2416]",
    subtext: "text-[#8a7d6b]",
    label: "text-[#8a7d6b]",
    docItem: "hover:bg-[#e0d8cc] text-[#3d3020]",
    docSelected: "bg-[#d4c9b8] text-[#2c2416] font-semibold",
    docBadge: "bg-[#c8bfb0] text-[#5a4e3c]",
    border: "border-[#d8d0c4]",
    input: "bg-[#ede8e0] border-[#c8bfb0]",
    userBubble: "bg-[#b5651d] text-white",
    aiBubble: "bg-white text-[#2c2416] border border-[#e0d8cc]",
    sourceLink: "text-[#b5651d]",
    divider: "bg-[#d8d0c4]",
    uploadBtn: "bg-[#b5651d] hover:bg-[#9e5519] text-white",
    modelBg: "bg-[#e4ddd4] border-[#c8bfb0]",
  };
  const D = {
    app: "bg-[#161b27]",
    sidebar: "bg-[#1e2433]",
    sidebarBorder: "border-[#2d3548]",
    chat: "bg-[#161b27]",
    text: "text-[#e8eaf0]",
    subtext: "text-[#6b7a99]",
    label: "text-[#6b7a99]",
    docItem: "hover:bg-[#252d40] text-[#c8d0e8]",
    docSelected: "bg-[#2a3550] text-white font-semibold",
    docBadge: "bg-[#2d3548] text-[#6b7a99]",
    border: "border-[#2d3548]",
    input: "bg-[#1e2433] border-[#2d3548]",
    userBubble: "bg-[#2979ff] text-white",
    aiBubble: "bg-[#252d40] text-[#e8eaf0] border border-[#2d3548]",
    sourceLink: "text-[#5b9cf6]",
    divider: "bg-[#2d3548]",
    uploadBtn: "bg-[#2979ff] hover:bg-[#1565c0] text-white",
    modelBg: "bg-[#252d40] border-[#2d3548]",
  };
  const T = isDark ? D : L;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Window chrome / title bar */}
      <div
        className={clsx(
          "px-4 py-3 flex items-center justify-between border-b",
          T.border,
        )}
      >
        <div className="flex items-center gap-2">
          {/* macOS dots */}
          <span className="w-3 h-3 rounded-full bg-[#ff5f57] inline-block" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e] inline-block" />
          <span className="w-3 h-3 rounded-full bg-[#28c840] inline-block" />
        </div>
        <span className={clsx("text-xs font-medium tracking-wide", T.subtext)}>
          ChatPDF Pro
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsDark(!isDark)}
            className={clsx("p-1 rounded transition-colors", T.subtext)}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className={clsx("lg:hidden p-1", T.subtext)}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {/* Model selector */}
        <div
          className={clsx(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs",
            T.modelBg,
            T.border,
          )}
        >
          <span className={T.subtext}>✦</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className={clsx(
              "flex-1 bg-transparent font-medium outline-none cursor-pointer",
              T.text,
            )}
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>

        {/* Upload */}
        <UploadZone onUploadComplete={handleUploadComplete} isDark={isDark} />

        {/* Documents */}
        <div>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <p
              className={clsx(
                "text-[10px] font-bold uppercase tracking-widest",
                T.label,
              )}
            >
              Documents
            </p>
            {documents.length > 0 && (
              <button
                onClick={handleClearAll}
                className={clsx("text-[10px] font-medium", T.sourceLink)}
              >
                Clear All
              </button>
            )}
          </div>
          {documents.length === 0 ? (
            <p className={clsx("text-xs italic px-1 py-2", T.subtext)}>
              No documents yet
            </p>
          ) : (
            <ul className="space-y-0.5">
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
                      "w-full text-left px-2 py-2 rounded-lg text-xs flex items-center gap-2 transition-all pr-14",
                      selectedDocId === doc.id ? T.docSelected : T.docItem,
                    )}
                  >
                    <span
                      className={clsx(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
                        T.docBadge,
                      )}
                    >
                      PDF
                    </span>
                    <span className="truncate flex-1">{doc.original_name}</span>
                  </button>
                  <button
                    onClick={(e) => handleSummaryClick(doc, e)}
                    disabled={summaryLoadingId === doc.id}
                    className={clsx(
                      "absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded transition-all",
                      T.sourceLink,
                    )}
                    title="Summary"
                  >
                    {summaryLoadingId === doc.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ClipboardList className="w-3 h-3" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(doc.id)}
                    className={clsx(
                      "absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded transition-all",
                      T.subtext,
                      "hover:text-red-400",
                    )}
                    title="Delete"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Divider and Chats section removed - single chat session */}
      </div>
    </div>
  );

  const chatPanel = (
    <ChatInterface
      messages={messages}
      isLoading={isLoading}
      streamingContent={streamingContent}
      onSendMessage={(msg) =>
        sendMessage(
          msg,
          selectedDocId ? [selectedDocId] : documents.map((d) => d.id),
          selectedModel,
        )
      }
      onSourceClick={handleSourceClick}
      isDark={isDark}
      // onToggleTheme={() => setIsDark(!isDark)}
      chatId={chatId}
      suggestions={suggestions}
      onSuggestionClick={(q) => {
        setSuggestions([]);
        sendMessage(
          q,
          selectedDocId ? [selectedDocId] : documents.map((d) => d.id),
          selectedModel,
        );
      }}
    />
  );

  const pdfPanel = (
    <PDFViewer
      fileUrl={fileUrl}
      pageNumber={pageNumber}
      highlightText={highlightText}
      isDark={isDark}
    />
  );

  return (
    <div className={clsx("flex h-screen overflow-hidden font-sans", T.app)}>
      {summary && (
        <SummaryModal
          docName={summary.docName}
          content={summary.content}
          isDark={isDark}
          onClose={() => setSummary(null)}
        />
      )}

      {/* ── DESKTOP sidebar (lg+) ── */}
      <div
        className={clsx(
          "hidden lg:flex flex-col w-[240px] flex-shrink-0 border-r",
          T.sidebar,
          T.sidebarBorder,
        )}
      >
        <SidebarContent />
      </div>

      {/* ── TABLET/MOBILE overlay sidebar ── */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={() => setSidebarOpen(false)}
          />
          <div
            className={clsx(
              "lg:hidden fixed left-0 top-0 h-full w-[240px] z-40 flex flex-col border-r shadow-2xl",
              T.sidebar,
              T.sidebarBorder,
            )}
          >
            <SidebarContent />
          </div>
        </>
      )}

      {/* ── MAIN ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── DESKTOP main (lg+) ── */}
        <div className="hidden lg:flex flex-1 overflow-hidden">
          {/* PDF Viewer */}
          <div className={clsx("flex-1 overflow-hidden", T.chat)}>
            {pdfPanel}
          </div>
          {/* Chat Panel */}
          <div
            className={clsx(
              "w-[400px] flex-shrink-0 border-l flex flex-col",
              T.sidebar,
              T.sidebarBorder,
            )}
          >
            {chatPanel}
          </div>
        </div>

        {/* ── TABLET (md–lg) ── */}
        <div className="hidden md:flex lg:hidden flex-col h-full">
          <div
            className={clsx(
              "flex items-center justify-between px-4 py-3 border-b flex-shrink-0",
              T.sidebar,
              T.sidebarBorder,
            )}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className={clsx("p-1.5 rounded-lg", T.subtext)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className={clsx("text-sm font-semibold", T.text)}>
              ChatPDF Pro
            </span>
            <button
              onClick={() => setIsDark(!isDark)}
              className={clsx("p-1.5 rounded-lg", T.subtext)}
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className={clsx("flex-1 overflow-hidden", T.chat)}>
              {chatPanel}
            </div>
            <div
              className={clsx(
                "w-[320px] flex-shrink-0 border-l",
                T.sidebarBorder,
              )}
            >
              {pdfPanel}
            </div>
          </div>
        </div>

        {/* ── MOBILE (< md) ── */}
        <div className="flex md:hidden flex-col h-full">
          <div
            className={clsx(
              "flex items-center justify-between px-4 py-3 border-b flex-shrink-0",
              T.sidebar,
              T.sidebarBorder,
            )}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className={clsx("p-1.5 rounded-lg", T.subtext)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className={clsx("text-sm font-semibold", T.text)}>
              ChatPDF Pro
            </span>
            <button
              onClick={() => setIsDark(!isDark)}
              className={clsx("p-1.5 rounded-lg", T.subtext)}
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className={clsx("flex-1 overflow-hidden", T.chat)}>
            {mobileTab === "sidebar" && (
              <div className={clsx("h-full overflow-y-auto", T.sidebar)}>
                <SidebarContent />
              </div>
            )}
            {mobileTab === "pdf" && pdfPanel}
            {mobileTab === "chat" && chatPanel}
          </div>
          <div
            className={clsx(
              "flex-shrink-0 border-t flex",
              T.sidebar,
              T.sidebarBorder,
            )}
          >
            {(
              [
                { tab: "sidebar" as MobileTab, icon: Menu, label: "Docs" },
                { tab: "pdf" as MobileTab, icon: FileSearch, label: "PDF" },
                {
                  tab: "chat" as MobileTab,
                  icon: MessageSquare,
                  label: "Chat",
                },
              ] as const
            ).map(({ tab, icon: Icon, label }) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab)}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors",
                  mobileTab === tab ? T.sourceLink : T.subtext,
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
