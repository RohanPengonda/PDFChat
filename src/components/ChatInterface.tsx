import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Loader2 } from 'lucide-react';
import { Message, Source } from '../hooks/useChat';
import ReactMarkdown from 'react-markdown';
import { clsx } from 'clsx';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  streamingContent: string;
  onSendMessage: (message: string) => void;
  onSourceClick: (source: Source) => void;
}

export function ChatInterface({ 
  messages, 
  isLoading, 
  streamingContent, 
  onSendMessage,
  onSourceClick
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="font-semibold text-gray-800">Chat Assistant</h2>
        <p className="text-xs text-gray-500">Ask questions about your documents</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p>No messages yet.</p>
            <p className="text-sm">Upload a PDF and start asking questions!</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className={clsx(
            "flex flex-col max-w-[85%]",
            msg.role === 'user' ? "self-end items-end" : "self-start items-start"
          )}>
            <div className={clsx(
              "p-3 rounded-lg text-sm shadow-sm",
              msg.role === 'user' 
                ? "bg-blue-600 text-white rounded-br-none" 
                : "bg-gray-100 text-gray-800 rounded-bl-none"
            )}>
              <div className="markdown-body">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
            
            {/* Citations */}
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {msg.sources.map((source, idx) => (
                  <button
                    key={`${msg.id}-source-${idx}`}
                    onClick={() => onSourceClick(source)}
                    className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <span className="font-medium">p.{source.page_number}</span>
                    <span className="truncate max-w-[100px] opacity-70">{source.file_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Streaming Message */}
        {isLoading && (
          <div className="self-start items-start flex flex-col max-w-[85%]">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-lg rounded-bl-none text-sm shadow-sm">
              {streamingContent ? (
                <div className="markdown-body">
                   <ReactMarkdown>{streamingContent}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
