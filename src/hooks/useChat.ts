import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

export interface Source {
  file_name: string;
  document_id: string;
  page_number: number;
  chunk_id: string;
  text: string;
  preview?: string;
  confidence?: number;
  char_start_pos?: number;
  char_end_pos?: number;
  citation_number?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export function useChat(chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamSources, setStreamSources] = useState<Source[]>([]);

  const injectSummary = useCallback((docName: string, summary: string) => {
    // kept for potential future use
  }, []);

  useEffect(() => {
    if (chatId) {
      api.getChatHistory(chatId).then((msgs: any) => {
          // Transform DB messages to UI messages
          const uiMsgs = msgs.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              // Sources are not stored in DB in this simple schema, but could be added to metadata column
              // For now, history won't show sources, only new messages
          }));
          setMessages(uiMsgs);
      }).catch(console.error);
    } else {
        setMessages([]);
    }
  }, [chatId]);

  const sendMessage = useCallback(async (content: string, documentIds: string[], model?: string) => {
    if (!chatId) return;

    // Add user message immediately
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent('');
    setStreamSources([]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, chatId, documentIds, model }),
      });

      if (!response.ok) throw new Error('Chat failed');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';
      let currentSources: Source[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last partial line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);
              
              if (data.text) {
                currentText += data.text;
                setStreamingContent(prev => prev + data.text);
              }
              if (data.sources) {
                currentSources = data.sources;
                setStreamSources(data.sources);
              }
              if (data.error) {
                  console.error("Stream error", data.error);
              }
            } catch (e) {
              console.error('Parse error', e);
            }
          }
        }
      }

      // Finalize message
      const assistantMsg: Message = { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: currentText, 
          sources: currentSources 
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      setStreamingContent('');
      setStreamSources([]);
      
    } catch (error) {
      console.error('Send message error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [chatId]);

  return { messages, isLoading, streamingContent, streamSources, sendMessage };
}
