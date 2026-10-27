import { useState, useEffect, useCallback } from "react";
import { UploadZone } from "./components/UploadZone";
import { PDFViewer } from "./components/PDFViewer";
import { ChatInterface } from "./components/ChatInterface";
import { SummaryModal } from "./components/SummaryModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { LoginScreen } from "./components/LoginScreen";
import { useToast } from "./components/Toast";
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
  ArrowLeft,
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
  const [mode, setMode] = useState<"single" | "all">("all");
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const toast = useToast();
  const [authState, setAuthState] = useState<"checking" | "login" | "ready">(
    "checking",
  );

  useEffect(() => {
    setMode(selectedDocId ? "single" : "all");
  }, [selectedDocId]);

  // Check whether the server requires a token and whether the stored one is
  // valid, before loading any app data.
  useEffect(() => {
    let cancelled = false;
    api
      .getAuthStatus()
      .then((status) => {
        if (cancelled) return;
        setAuthState(!status.required || status.authenticated ? "ready" : "login");
      })
      .catch(() => {
        if (!cancelled) setAuthState("login");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A request that gets 401 (expired/rotated token) drops us back to login.
  useEffect(() => {
    const onUnauthorized = () => {
      try {
        localStorage.removeItem("pdfchat.chatId");
      } catch {
        // Ignore storage access failures.
      }
      setChatId(null);
      setAuthState((s) => (s === "ready" ? "login" : s));
    };
    window.addEventListener("pdfchat:unauthorized", onUnauthorized);
    return () => window.removeEventListener("pdfchat:unauthorized", onUnauthorized);
  }, []);

  // Load documents and the active chat only once authenticated.
  useEffect(() => {
    if (authState !== "ready") return;
    api.getDocuments().then(setDocuments).catch(console.error);
    const storedChatId = localStorage.getItem("pdfchat.chatId");
    if (storedChatId) {
      setChatId(storedChatId);
    } else {
      api
        .createChat()
        .then((chat) => {
          localStorage.setItem("pdfchat.chatId", chat.id);
          setChatId(chat.id);
        })
        .catch(console.error);
    }
  }, [authState]);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    document.body.style.backgroundColor = isDark ? "#161b27" : "#ede8e0";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", isDark ? "#161b27" : "#ede8e0");
  }, [isDark]);

  // Recover from a chat id that no longer exists server-side (e.g. DB reset)
  // by transparently creating a fresh chat.
  const recoverChat = useCallback(async () => {
    try {
      const chat = await api.createChat();
      localStorage.setItem("pdfchat.chatId", chat.id);
      setChatId(chat.id);
    } catch (e) {
      console.error("Chat recovery failed:", e);
    }
  }, []);

  const {
    messages,
    isLoading,
    streamingContent,
    sendMessage,
    suggestions,
    setSuggestions,
  } = useChat(chatId, recoverChat);

  const handleUploadComplete = async (doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
    setSelectedDocId(doc.id);
    setSidebarOpen(false);
    setMobileTab("pdf");
    try {
      const content = await api.getDocumentSummary(doc.id);
      setSummary({ docName: doc.original_name || doc.filename, content });
    } catch (e) {
      console.error("Summary failed:", e);
      toast("Could not generate a summary for this document.", "error");
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
    setSelectedDocId(source.pdf_id);
    setPageNumber(source.page_number);
    setHighlightText(source.text);
    setMobileTab("pdf");
  };

  const handleNewChat = async () => {
    try {
      const chat = await api.createChat();
      localStorage.setItem("pdfchat.chatId", chat.id);
      setChatId(chat.id);
      setSuggestions([]);
    } catch (e) {
      console.error("New chat failed:", e);
      toast("Could not start a new chat.", "error");
    }
  };

  const handleClearChat = async () => {
    if (!chatId) return;
    if (!window.confirm("Clear this chat? This cannot be undone.")) return;
    try {
      await api.deleteChat(chatId);
      const chat = await api.createChat();
      localStorage.setItem("pdfchat.chatId", chat.id);
      setChatId(chat.id);
      setSuggestions([]);
    } catch (e) {
      console.error("Clear chat failed:", e);
      toast("Could not clear chat.", "error");
    }
  };

  const handleDeleteDoc = (docId: string) => {
    setConfirmState({
      title: "Delete document",
      message:
        "This removes the document and its indexed content. This cannot be undone.",
      confirmLabel: "Delete",
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.deleteDocument(docId);
          setDocuments((prev) => prev.filter((d) => d.id !== docId));
          if (selectedDocId === docId) setSelectedDocId(null);
        } catch (e) {
          console.error("Delete failed:", e);
          toast("Failed to delete document.", "error");
        }
      },
    });
  };

  const handleClearAll = () => {
    setConfirmState({
      title: "Clear all documents",
      message: "This deletes every uploaded document and its indexed content.",
      confirmLabel: "Clear all",
      onConfirm: async () => {
        setConfirmState(null);
        try {
          await api.clearAllDocuments();
          setDocuments([]);
          setSelectedDocId(null);
        } catch (e) {
          console.error("Clear failed:", e);
          toast("Failed to clear documents.", "error");
        }
      },
    });
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
    sourceLink: "text-[#b5651d]",
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
    sourceLink: "text-[#5b9cf6]",
    modelBg: "bg-[#252d40] border-[#2d3548]",
  };
  const T = isDark ? D : L;

  const SidebarContent = ({ chrome = true }: { chrome?: boolean } = {}) => (
    <div className="flex flex-col h-full">
      {/* Window chrome / title bar */}
      {chrome && (
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
            PDFChat
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
      )}

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
                      "absolute right-6 top-1/2 -translate-y-1/2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded transition-all",
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
                      "absolute right-1.5 top-1/2 -translate-y-1/2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded transition-all",
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
      </div>
    </div>
  );

  const chatPanel = (
    <ChatInterface
      messages={messages}
      isLoading={isLoading}
      streamingContent={streamingContent}
      onSendMessage={(msg) =>
        sendMessage(msg, mode, selectedDocId || undefined, selectedModel)
      }
      onSourceClick={handleSourceClick}
      isDark={isDark}
      chatId={chatId}
      suggestions={suggestions}
      onSuggestionClick={(q) => {
        setSuggestions([]);
        sendMessage(q, mode, selectedDocId || undefined, selectedModel);
      }}
      mode={mode}
      onModeChange={setMode}
      documents={documents}
      selectedDocId={selectedDocId}
      onNewChat={handleNewChat}
      onClearChat={handleClearChat}
    />
  );

  const pdfPanel = (
    <PDFViewer
      fileUrl={fileUrl}
      pageNumber={pageNumber}
      highlightText={highlightText}
      isDark={isDark}
      onSummaryClick={() => {
        if (selectedDocId) {
          const doc = documents.find((d) => d.id === selectedDocId);
          if (doc) {
            setSummaryLoadingId(selectedDocId);
            api
              .getDocumentSummary(selectedDocId)
              .then((content) => {
                setSummary({ docName: doc.original_name, content });
              })
              .catch(() => {
                setSummary({
                  docName: doc.original_name,
                  content: "Failed to generate summary.",
                });
              })
              .finally(() => setSummaryLoadingId(null));
          }
        }
      }}
      isLoadingSummary={summaryLoadingId === selectedDocId}
    />
  );

  if (authState === "checking") {
    return (
      <div
        className={clsx(
          "flex h-dvh items-center justify-center font-sans",
          T.app,
        )}
      >
        <div className="flex items-center gap-2 text-sm opacity-60">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  if (authState === "login") {
    return <LoginScreen onAuthenticated={() => setAuthState("ready")} isDark={isDark} />;
  }

  return (
    <div className={clsx("flex h-dvh overflow-hidden font-sans", T.app)}>
      {summary && (
        <SummaryModal
          docName={summary.docName}
          content={summary.content}
          isDark={isDark}
          onClose={() => setSummary(null)}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          isDark={isDark}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
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
              PDFChat
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
              PDFChat
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
          <div className={clsx("flex-1 overflow-hidden relative", T.chat)}>
            {mobileTab === "sidebar" && (
              <div className={clsx("h-full overflow-y-auto", T.sidebar)}>
                <SidebarContent chrome={false} />
              </div>
            )}
            {mobileTab === "pdf" && pdfPanel}
            {mobileTab === "chat" && chatPanel}

            {/* Floating affordance on mobile so a user reading a cited PDF can
              return to chat without hunting through the bottom tab bar. */}
            {mobileTab === "pdf" && selectedDocId && (
              <button
                onClick={() => setMobileTab("chat")}
                className={clsx(
                  "fixed bottom-24 left-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium shadow-lg",
                  isDark
                    ? "bg-[#252d40] text-[#5b9cf6] border border-[#2d3548]"
                    : "bg-white text-[#b5651d] border border-[#d8d0c4]",
                )}
              >
                <ArrowLeft className="w-3 h-3" />
                Back to chat
              </button>
            )}
          </div>
          <div
            className={clsx(
              "flex-shrink-0 border-t flex pb-[env(safe-area-inset-bottom)]",
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
