import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Moon, Sun, Copy, Check } from "lucide-react";
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
  onToggleTheme?: () => void;
  chatId?: string | null;
}

export function ChatInterface({
  messages,
  isLoading,
  streamingContent,
  onSendMessage,
  onSourceClick,
  isDark = true,
  onToggleTheme,
  chatId,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState("Chat Assistant");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleSetRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Auto-set title from first user message
  useEffect(() => {
    if (titleSetRef.current || !chatId) return;
    const firstUser = messages.find((m) => m.role === "user");
    if (firstUser) {
      const title =
        firstUser.content.slice(0, 40) +
        (firstUser.content.length > 40 ? "…" : "");
      setChatTitle(title);
      titleSetRef.current = true;
      api.updateChatTitle(chatId, title).catch(() => {});
    }
  }, [messages, chatId]);

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTitleEdit = () => {
    setTitleInput(chatTitle);
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  const handleTitleSave = () => {
    const t = titleInput.trim();
    if (t) {
      setChatTitle(t);
      if (chatId) api.updateChatTitle(chatId, t).catch(() => {});
    }
    setIsEditingTitle(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput("");
  };

  const text = isDark ? "text-white" : "text-gray-900";
  const subtext = isDark ? "text-gray-400" : "text-gray-500";
  const border = isDark ? "border-[#2a2d3e]" : "border-gray-200";
  const inputBg = isDark
    ? "bg-[#0f1120] border-[#2a2d3e]"
    : "bg-gray-100 border-gray-200";
  const aiBubble = isDark
    ? "bg-[#1e2235] text-gray-100 border border-[#2a2d3e]"
    : "bg-gray-100 text-gray-800";
  const userBubble = "bg-[#2a3a5c] text-white";
  const sourceCard = isDark
    ? "bg-[#1a1d2e] border-[#2a2d3e] hover:border-blue-500/40 hover:bg-[#1e2235]"
    : "bg-gray-50 border-gray-200 hover:border-blue-300";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className={clsx(
          "px-5 py-4 border-b flex items-center justify-between",
          border,
        )}
      >
        <div className="flex-1 min-w-0 mr-2">
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleSave();
                if (e.key === "Escape") setIsEditingTitle(false);
              }}
              className={clsx(
                "w-full bg-transparent font-semibold text-sm outline-none border-b pb-0.5",
                text,
                isDark ? "border-blue-500" : "border-blue-400",
              )}
            />
          ) : (
            <h2
              onClick={handleTitleEdit}
              title="Click to rename"
              className={clsx(
                "font-semibold text-sm truncate cursor-pointer hover:opacity-70 transition-opacity",
                text,
              )}
            >
              {chatTitle}
            </h2>
          )}
          <p className={clsx("text-[11px] mt-0.5", subtext)}>
            Ask questions about your documents
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleTheme}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              isDark
                ? "text-gray-400 hover:text-white hover:bg-white/5"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
            )}
          >
            {isDark ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onToggleTheme}
            className={clsx(
              "p-2 rounded-lg transition-colors",
              !isDark
                ? "text-gray-400 hover:text-white hover:bg-white/5"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100",
            )}
          >
            {isDark ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center pb-10">
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
              "flex flex-col gap-2",
              msg.role === "user" ? "items-end" : "items-start",
            )}
          >
            <div
              className={clsx(
                "px-4 py-3 rounded-2xl text-sm max-w-[88%] leading-relaxed relative group/msg",
                msg.role === "user"
                  ? clsx(userBubble, "rounded-tr-sm")
                  : clsx(aiBubble, "rounded-tl-sm"),
              )}
            >
              <div className={clsx("prose prose-sm max-w-none", isDark ? "prose-invert" : "")}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
              {msg.role === "assistant" && (
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className={clsx(
                    "absolute -top-2 -right-2 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover/msg:opacity-100 transition-all shadow-lg",
                    isDark
                      ? "bg-[#2a2d3e] text-gray-400 hover:text-white"
                      : "bg-white text-gray-400 hover:text-gray-700 border border-gray-200",
                  )}
                  title="Copy answer"
                >
                  {copiedId === msg.id ? (
                    <Check className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>

            {/* Sources */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="w-full max-w-[88%] space-y-1.5">
                <p
                  className={clsx(
                    "text-[10px] font-semibold uppercase tracking-widest px-1",
                    subtext,
                  )}
                >
                  Sources
                </p>
                {msg.sources.map((source, idx) => (
                  <button
                    key={`${msg.id}-src-${idx}`}
                    onClick={() => onSourceClick(source)}
                    className={clsx(
                      "w-full text-left border rounded-xl p-3 transition-all group",
                      sourceCard,
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span
                            className={clsx(
                              "text-[11px] font-medium truncate max-w-[130px]",
                              subtext,
                            )}
                          >
                            {source.file_name}
                          </span>
                          <span
                            className={clsx(
                              "text-[10px] px-1.5 py-0.5 rounded-md",
                              isDark
                                ? "bg-white/5 text-gray-400"
                                : "bg-gray-200 text-gray-500",
                            )}
                          >
                            p.{source.page_number}
                          </span>
                          {source.confidence && source.confidence > 50 && (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md">
                              {source.confidence}%
                            </span>
                          )}
                        </div>
                        <p
                          className={clsx(
                            "text-[11px] line-clamp-2 group-hover:line-clamp-none italic leading-relaxed",
                            subtext,
                          )}
                        >
                          "{(source.preview || source.text).substring(0, 120)}
                          {(source.preview || source.text).length > 120
                            ? "…"
                            : ""}
                          "
                        </p>
                      </div>
                    </div>
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
                "px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[88%]",
                aiBubble,
              )}
            >
              {streamingContent ? (
                <div className="prose prose-sm max-w-none prose-invert">
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

      {/* Input */}
      <form onSubmit={handleSubmit} className={clsx("p-4 border-t", border)}>
        <div
          className={clsx(
            "flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors focus-within:border-blue-500/50",
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
              "placeholder:text-gray-500",
            )}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={clsx(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0",
              input.trim() && !isLoading
                ? "bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                : "text-gray-600 cursor-not-allowed",
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
