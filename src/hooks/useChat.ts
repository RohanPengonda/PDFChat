import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError, getAuthHeaders } from '../lib/api';
import { useToast } from '../components/Toast';

export interface Source {
  file_name: string;
  pdf_id: string;
  page_number: number;
  text: string;
  confidence?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export function useChat(chatId: string | null, onChatInvalid?: () => void) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const toast = useToast();
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream when the chat changes or the hook unmounts so a
  // stale answer cannot land in the wrong conversation.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      setStreamingContent('');
      setIsLoading(false);
    };
  }, [chatId]);

  useEffect(() => {
    // Suggestions belong to the previous conversation; drop them on chat switch.
    setSuggestions([]);
    if (chatId) {
      api.getChatHistory(chatId).then((msgs) => {
          const uiMsgs = (msgs as Message[]).map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              sources: m.sources,
          }));
          setMessages(uiMsgs);
      }).catch((error) => {
        // The stored chat no longer exists (e.g. after a DB reset). Let the app
        // start a fresh chat instead of silently showing an empty conversation.
        if (error instanceof ApiError && error.status === 404) {
          onChatInvalid?.();
          return;
        }
        console.error(error);
      });
    } else {
        setMessages([]);
    }
  }, [chatId, onChatInvalid]);

  const sendMessage = useCallback(async (content: string, mode: 'single' | 'all', pdf_id: string | undefined, model?: string) => {
    if (!chatId) return;

    // Cancel any in-flight stream so a stale answer can't be appended here.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Add user message immediately
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: content, chatId, mode, pdf_id, model }),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('pdfchat:unauthorized'));
        }
        throw new Error('Chat failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let buffer = '';
      let currentText = '';
      let currentSources: Source[] = [];
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || ''; // Keep the last partial line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.text) {
                currentText += data.text;
                setStreamingContent(prev => prev + data.text);
              }
              if (data.sources) {
                currentSources = data.sources;
              }
              if (data.error) {
                streamError = data.error;
              }
            } catch (e) {
              console.error('Parse error', e);
            }
          }
        }
      }

      // Superseded by a newer request: discard this result entirely.
      if (controller.signal.aborted) return;

      // Never render an empty assistant bubble; surface the failure instead.
      if (currentText) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: currentText,
          sources: currentSources,
        };
        setMessages(prev => [...prev, assistantMsg]);
      }

      if (streamError) {
        toast(streamError, 'error');
      }

      setStreamingContent('');

      // Fetch suggestions after a successful answer (non-blocking). In "all"
      // mode no pdf_id is sent so suggestions span the whole library.
      if (currentText) {
        const scope = mode === 'single' ? pdf_id : undefined;
        api.getSuggestions(scope, content)
          .then(result => { if (result.length > 0) setSuggestions(result); })
          .catch(() => {});
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Send message error:', error);
      toast('Failed to get a response. Please try again.', 'error');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [chatId, toast]);

  return { messages, isLoading, streamingContent, sendMessage, suggestions, setSuggestions };
}
