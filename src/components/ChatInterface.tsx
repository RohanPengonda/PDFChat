import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Copy, Check, ArrowUpRight } from "lucide-react";
import { Message, Source } from "../hooks/useChat";
import ReactMarkdown from "react-markdown";
import { clsx } from "clsx";
import { api } from "../lib/api";

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  onSendMessage: (message: string) => void;
  onSourceClick: (source: Source) => void;
  isDark?: boolean;
  chatId?: string | null;
  suggestions?: string[];
  onSuggestionClick?: (question: string) => void;
  mode: "single" | "all";
  onModeChange: (mode: "single" | "all") => void;
  documents: { id: string; filename: string; original_name: string }[];
  selectedDocId: string | null;
}

export function ChatInterface({
  messages,
  isLoading,
  streamingContent,
  onSendMessage,
  onSourceClick,
  isDark = false,
  chatId,
  suggestions = [],
  onSuggestionClick,
  mode,
  onModeChange,
  documents,
  selectedDocId,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleSetRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-save title from first user message
  useEffect(() => {
    if (titleSetRef.current || !chatId) return;
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser) {
      const title =
        firstUser.content.slice(0, 40) +
        (firstUser.content.length > 40 ? "…" : "");
      titleSetRef.current = true;
      api.updateChatTitle(chatId, title).catch(() => {});
    }
  }, [messages, chatId]);

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput("");
  };

  // Theme tokens
  const bg = isDark ? "bg-[#161b27]" : "bg-[#f7f4f0]";
  const text = isDark ? "text-[#e8eaf0]" : "text-[#2c2416]";
  const subtext = isDark ? "text-[#6b7a99]" : "text-[#8a7d6b]";
  const border = isDark ? "border-[#2d3548]" : "border-[#d8d0c4]";
  const inputBg = isDark
    ? "bg-[#1e2433] border-[#2d3548]"
    : "bg-white border-[#d8d0c4]";
  const userBubble = isDark
    ? "bg-[#2979ff] text-white"
    : "bg-[#b5651d] text-white";
  const aiBubble = isDark
    ? "bg-[#252d40] text-[#e8eaf0] border border-[#2d3548]"
    : "bg-white text-[#2c2416] border border-[#e0d8cc]";
  const sourceLink = isDark ? "text-[#5b9cf6]" : "text-[#b5651d]";
  const copyBtn = isDark
    ? "bg-[#2d3548] text-[#6b7a99] hover:text-white"
    : "bg-[#ede8e0] text-[#8a7d6b] hover:text-[#2c2416] border border-[#d8d0c4]";

  return (
    <div className={clsx("flex flex-col h-full", bg)}>
      {/* Chat header */}
      <div
        className={clsx(
          "px-4 py-3 border-b flex items-center justify-between flex-shrink-0",
          border,
        )}
      >
        <span
          className={clsx(
            "text-xs font-bold uppercase tracking-widest",
            subtext,
          )}
        >
          Chat
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <p className={clsx("text-sm font-medium", text)}>
              No messages yet.
            </p>
            <p className={clsx("text-xs", subtext)}>
              Upload a PDF and start asking questions!
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx(
              "flex flex-col",
              msg.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={clsx(
                "px-4 py-3 rounded-2xl text-sm max-w-[80%] leading-relaxed relative group/msg",
                msg.role === "user"
                  ? clsx(userBubble, "rounded-tr-sm")
                  : clsx(aiBubble, "rounded-tl-sm"),
              )}
            >
              <div
                className={clsx(
                  "prose prose-sm max-w-none",
                  isDark ? "prose-invert" : "",
                )}
              >
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.role === "assistant" && (
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className={clsx(
                    "absolute -top-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover/msg:opacity-100 transition-all shadow-sm",
                    copyBtn,
                  )}
                  title="Copy"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            {/* Sources — shown as inline links like reference image */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-1.5 max-w-[80%] space-y-1">
                {msg.sources.map((source, idx) => (
                  <button
                    key={`${msg.id}-src-${idx}`}
                    onClick={() => onSourceClick(source)}
                    className={clsx(
                      "flex items-center gap-1 text-xs transition-opacity hover:opacity-70",
                      sourceLink,
                    )}
                  >
                    <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                    <span>
                      Source: Page {source.page_number} — {source.file_name}
                    </span>
                    {source.confidence && source.confidence > 50 && (
                      <span className={clsx("ml-1 text-[10px] opacity-60")}>
                        {source.confidence}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Streaming */}
        {isLoading && (
          <div className="flex items-start">
            <div
              className={clsx(
                "px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[80%]",
                aiBubble,
              )}
            >
              {streamingContent ? (
                <div
                  className={clsx(
                    "prose prose-sm max-w-none",
                    isDark ? "prose-invert" : "",
                  )}
                >
                  <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              ) : (
                <div className={clsx("flex items-center gap-2", subtext)}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Thinking…</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      {suggestions.length > 0 && !isLoading && (
        <div
          className={clsx(
            "px-4 py-2 flex flex-wrap gap-1.5",
            isDark ? "bg-[#1a1f2e]" : "bg-[#f0ebe3]",
          )}
        >
          <p
            className={clsx(
              "w-full text-[10px] font-semibold uppercase tracking-widest mb-1",
              subtext,
            )}
          >
            Suggested
          </p>
          {suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSuggestionClick?.(q)}
              className={clsx(
                "text-xs px-3 py-1.5 rounded-full border transition-all text-left",
                isDark
                  ? "border-[#2d3548] text-[#a0b0cc] hover:border-[#5b9cf6] hover:text-[#5b9cf6] hover:bg-[#1e2433]"
                  : "border-[#c8bfb0] text-[#6b5a45] hover:border-[#b5651d] hover:text-[#b5651d] hover:bg-white",
              )}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={clsx("px-4 py-2 border-t", border)}>
        <div className={clsx("flex items-center gap-2 mb-2")}>
          <span className={clsx("text-xs font-medium", subtext)}>
            Query Mode:
          </span>
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value as "single" | "all")}
            className={clsx(
              "text-xs px-2 py-1 rounded border",
              inputBg,
              border,
              text,
            )}
          >
            <option value="single">
              This PDF (
              {documents.find((d) => d.id === selectedDocId)?.original_name ||
                "None"}
              )
            </option>
            <option value="all">All PDFs</option>
          </select>
        </div>
        <form
          onSubmit={handleSubmit}
          className={clsx(
            "flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-colors focus-within:border-opacity-80",
            inputBg,
          )}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className={clsx(
              "flex-1 bg-transparent text-sm outline-none",
              text,
              isDark
                ? "placeholder:text-[#4a5568]"
                : "placeholder:text-[#b0a090]",
            )}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={clsx(
              "w-7 h-7 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
              input.trim() && !isLoading
                ? isDark
                  ? "bg-[#2979ff] text-white"
                  : "bg-[#b5651d] text-white"
                : "opacity-30 cursor-not-allowed " + subtext,
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
