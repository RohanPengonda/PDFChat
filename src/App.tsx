import { useState, useEffect } from "react";
import { UploadZone } from "./components/UploadZone";
import { PDFViewer } from "./components/PDFViewer";
import { ChatInterface } from "./components/ChatInterface";
import { useChat, Source } from "./hooks/useChat";
import { api } from "./lib/api";
import { FileText, MessageSquare, Menu, X } from "lucide-react";
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
  const [highlightText, setHighlightText] = useState<string | undefined>(
    undefined,
  );
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");

  // Initialize
  useEffect(() => {
    // Load documents
    api.getDocuments().then(setDocuments).catch(console.error);

    // Create new chat session
    api
      .createChat()
      .then((chat) => setChatId(chat.id))
      .catch(console.error);
  }, []);

  const { messages, isLoading, streamingContent, sendMessage } =
    useChat(chatId);

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

  const selectedDoc = documents.find((d) => d.id === selectedDocId);
  const fileUrl = selectedDocId
    ? `/api/documents/${selectedDocId}/content`
    : null;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <div
        className={clsx(
          "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 absolute z-10 h-full md:relative",
          isSidebarOpen
            ? "w-80 translate-x-0"
            : "w-0 -translate-x-full md:w-0 md:translate-x-0 overflow-hidden",
        )}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="font-bold text-xl text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            ChatPDF Q&A
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          {/* Model Selection */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              AI Model
            </h3>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
            </select>
          </div>

          {/* Upload */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Upload Document
            </h3>
            <UploadZone onUploadComplete={handleUploadComplete} />
          </div>

          {/* Documents List */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Your Documents
              </h3>
              {documents.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No documents yet</p>
            ) : (
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="group relative">
                    <button
                      onClick={() => {
                        setSelectedDocId(doc.id);
                        setPageNumber(1);
                        setHighlightText(undefined);
                      }}
                      className={clsx(
                        "w-full text-left p-2 rounded-md text-sm flex items-center gap-2 transition-colors",
                        selectedDocId === doc.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      <FileText className="w-4 h-4" />
                      <span className="truncate flex-1">
                        {doc.original_name}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                      title="Delete"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Mobile Header */}
        <div className="md:hidden p-4 bg-white border-b border-gray-200 flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold">
            {selectedDoc ? selectedDoc.original_name : "Gemini RAG Platform"}
          </span>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* PDF Viewer Area */}
          <div
            className={clsx(
              "flex-1 bg-gray-100 relative transition-all duration-300",
              // On mobile, hide PDF if chat is active? No, let's stack or split.
              // For this demo, we'll do a 50/50 split on desktop, and stack on mobile?
              // Or maybe just show PDF on left, Chat on right.
            )}
          >
            <PDFViewer
              fileUrl={fileUrl}
              pageNumber={pageNumber}
              highlightText={highlightText}
            />
          </div>

          {/* Chat Area - Fixed width on desktop */}
          <div className="w-full md:w-[400px] lg:w-[450px] bg-white border-l border-gray-200 h-full z-0">
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
            />
          </div>
        </div>
      </div>
    </div>
  );
}
