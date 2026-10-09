import { GoogleGenAI } from '@google/genai';
import { db, type Source } from './db';
import { vectorStore } from './vector';
import { generateEmbedding } from './embedding';
import { Response } from 'express';
import prompts from './prompts.json';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Suggestions are cheap to reuse for a while and expensive (Gemini) to regenerate.
const SUGGESTION_TTL_MS = 10 * 60 * 1000;
const suggestionCache = new Map<string, { value: string[]; expires: number }>();

export const chatService = {
  async generateResponse(message: string, chatId: string, mode: 'single' | 'all', pdf_id: string | undefined, res: Response, model?: string, userId?: string) {
    // 1. Validate chat and ownership
    const chat = db.getChat(chatId, userId);
    if (!chat) {
      res.write(`data: ${JSON.stringify({ error: 'Chat not found or access denied' })}\n\n`);
      res.end();
      return;
    }

    // 2. Build bounded conversation history so follow-up questions keep context.
    // Consecutive same-role turns are merged to satisfy the model's alternation rules.
    const history = db.getMessages(chatId, userId) as { role: 'user' | 'assistant'; content: string }[];
    const contents: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const m of history.slice(-20)) {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const last = contents[contents.length - 1];
      if (last && last.role === role) {
        last.parts[0].text += `\n\n${m.content}`;
      } else {
        contents.push({ role, parts: [{ text: m.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    // Persist the user message before generation so it is never lost on failure.
    db.addMessage(chatId, 'user', message);

    // 3. Generate Embedding for Query
    const queryVector = generateEmbedding(message);

    // 4. Retrieve Context with query text for hybrid matching
    const documentIds = mode === 'single' && pdf_id ? [pdf_id] : undefined;
    const filter = documentIds && documentIds.length > 0 ? { pdf_ids: documentIds, query: message } : { query: message };
    const relevantChunks = await vectorStore.query(queryVector, 5, filter);

    // 5. Construct Prompt - number directly from array to avoid index mismatch
    const numberedContext = relevantChunks.map((chunk, idx) =>
      `[${idx + 1}] [Page: ${chunk.metadata.page_number}]\n${chunk.metadata.text}`
    ).join('\n\n');

    const systemInstruction = `${prompts.chat.systemInstruction}

Context:
${numberedContext}
`;

    // 6. Generate Response (Streaming)
    const selectedModel = model || "gemini-2.5-flash";

    // Retry logic for transient errors (503/429 rate limits and network drops)
    let retries = 3;
    let result: Awaited<ReturnType<typeof ai.models.generateContentStream>> | undefined;

    const isRetryable = (e: any): boolean => {
      if (e?.status === 503 || e?.status === 429) return true;
      // Network-level failures surface as "fetch failed"/socket errors with no HTTP status
      if (e?.status === undefined) {
        const msg = `${e?.message || ''} ${e?.cause?.message || ''}`;
        return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network/i.test(msg);
      }
      return false;
    };

    while (retries > 0) {
      try {
        result = await ai.models.generateContentStream({
          model: selectedModel,
          contents,
          config: { systemInstruction },
        });
        break;
      } catch (error: any) {
        if (isRetryable(error) && retries > 1) {
          retries--;
          const delay = (4 - retries) * 3000;
          console.log(`Model ${selectedModel} unavailable (${error?.status || error?.message}), retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          const msg = error?.message || 'Model error';
          res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
          res.end();
          return;
        }
      }
    }

    if (!result) {
      res.write(`data: ${JSON.stringify({ error: 'Model error' })}\n\n`);
      res.end();
      return;
    }

    let fullResponse = '';

    try {
      for await (const chunk of result) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullResponse += chunkText;
          res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
        }
      }
    } catch (error: any) {
      console.error('Stream interrupted:', error?.message || error);
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ error: error?.message || 'Stream failed' })}\n\n`);
        res.end();
      }
      return;
    }

    // 7. Build Citations - only include chunks actually cited in the response
    // Parse citation numbers used in the response e.g. [1], [2]
    const citedNumbers = new Set<number>();
    const citationRegex = /\[(\d+)\]/g;
    let match;
    while ((match = citationRegex.exec(fullResponse)) !== null) {
      citedNumbers.add(parseInt(match[1]));
    }

    // If no citations found, fall back to all retrieved chunks
    const chunksToShow = citedNumbers.size > 0
      ? relevantChunks.filter((_, idx) => citedNumbers.has(idx + 1))
      : relevantChunks;

    const questionWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    const sources: Source[] = chunksToShow
      .map((c) => {
        const chunkText = c.metadata.text;

        const sentences = chunkText.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 10);
        let bestSentence = sentences[0] || chunkText;
        let bestScore = 0;
        for (const sentence of sentences) {
          const score = questionWords.filter((w: string) => sentence.toLowerCase().includes(w)).length;
          if (score > bestScore) { bestScore = score; bestSentence = sentence; }
        }

        // Only skip low-relevance chunks in fallback mode (no model citations);
        // chunks explicitly cited by the model must always be shown.
        if (citedNumbers.size === 0 && bestScore === 0) return null;

        return {
          file_name: c.metadata.file_name,
          pdf_id: c.metadata.pdf_id,
          page_number: c.metadata.page_number,
          text: bestSentence.trim(),
          confidence: Math.round(c.score * 100)
        };
      })
      .filter((s): s is Source => s !== null);

    // 8. Persist the assistant message together with its sources so history
    // can render citations after a reload.
    db.addMessage(chatId, 'assistant', fullResponse, sources);

    res.write(`data: ${JSON.stringify({ sources })}\n\n`);
    res.end();
  },

  async generateSuggestions(documentId: string, lastQuestion: string): Promise<string[]> {
    const cacheKey = `${documentId}:${lastQuestion}`;
    const cached = suggestionCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.value;

    const allChunks = db.getAllChunks(documentId);
    if (allChunks.length === 0) return [];

    const step = Math.max(1, Math.floor(allChunks.length / 6));
    const sampledChunks = allChunks.filter((_, i) => i % step === 0).slice(0, 6);
    const sampleText = sampledChunks.map((c) => c.content).join('\n\n');

    const prompt = `${prompts.suggestions.prompt}\n\nDocument content:\n${sampleText}\n\nLast question asked: "${lastQuestion}"`;

    let retries = 2;
    while (retries >= 0) {
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const raw = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const cleaned = raw.trim().replace(/^```json\n?|^```\n?|\n?```$/g, '').trim();
        let parsed: unknown;
        try {
          parsed = JSON.parse(cleaned);
        } catch (e) {
          console.error('Suggestions JSON parse error:', e instanceof Error ? e.message : e);
          return [];
        }
        const candidates: string[] = Array.isArray(parsed) ? parsed.slice(0, 6) : [];

        const validated: string[] = [];
        for (const question of candidates) {
          if (validated.length >= 3) break;
          const qVector = generateEmbedding(question);
          const chunks = await vectorStore.query(qVector, 1, { pdf_ids: [documentId], query: question });
          if (chunks.length > 0) {
            validated.push(question);
          }
        }
        suggestionCache.set(cacheKey, { value: validated, expires: Date.now() + SUGGESTION_TTL_MS });
        return validated;
      } catch (error: any) {
        if ((error.status === 503 || error.status === 429) && retries > 0) {
          retries--;
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        console.error('Suggestions generation error:', error?.message || error);
        return [];
      }
    }
    return [];
  },

  async generateSummary(documentId: string): Promise<string> {
    const allChunks = db.getAllChunks(documentId);
    if (allChunks.length === 0) return 'No content found in this document.';
    const sampleChunks = allChunks.slice(0, 6).map((c) => c.content).join('\n\n');

    const prompt = `${prompts.summary.systemRole}

${prompts.summary.format}

Document text:
${sampleChunks}`;

    const isRetryable = (e: any): boolean => {
      if (e?.status === 503 || e?.status === 429) return true;
      if (e?.status === undefined) {
        const msg = `${e?.message || ''} ${e?.cause?.message || ''}`;
        return /fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|network/i.test(msg);
      }
      return false;
    };

    let retries = 3;
    while (retries > 0) {
      try {
        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const text = result.text;
        if (text) return text;
        const candidate = result.candidates?.[0];
        return candidate?.content?.parts?.[0]?.text || 'Could not generate summary.';
      } catch (error: any) {
        if (isRetryable(error) && retries > 1) {
          retries--;
          await new Promise(r => setTimeout(r, 3000));
        } else {
          console.error('Summary generation error:', error?.message || error);
          throw error;
        }
      }
    }
    return 'Could not generate summary.';
  }
};
