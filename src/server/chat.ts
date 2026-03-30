import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import { vectorStore } from './vector';
import { Response } from 'express';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const chatService = {
  async generateResponse(message: string, chatId: string, documentIds: string[] | undefined, res: Response, model?: string) {
    // 1. Save User Message
    db.addMessage(chatId, 'user', message);

    // 2. Generate Embedding for Query
    const queryVector = await this.generateEmbedding(message);

    // 3. Retrieve Context with query text for hybrid matching
    const filter = documentIds && documentIds.length > 0 ? { document_ids: documentIds, query: message } : { query: message };
    const relevantChunks = await vectorStore.query(queryVector, 5, filter);

    // 4. Construct Prompt - number directly from array to avoid index mismatch
    const numberedContext = relevantChunks.map((chunk, idx) =>
      `[${idx + 1}] [Page: ${chunk.metadata.page_number}]\n${chunk.metadata.text}`
    ).join('\n\n');

    const systemInstruction = `You are a helpful document assistant. Answer questions based on the provided context.

IMPORTANT INSTRUCTIONS:
- Provide clear, direct answers based on the context.
- Use inline citations [1], [2], [3] matching the numbered context blocks below.
- Place citations immediately after the relevant sentence or fact.
- ONLY cite a source if you actually used information from it.
- If the context does NOT contain the answer, say "The provided document does not contain information about this topic."
- Be concise and accurate.

Context:
${numberedContext}
`;

    // 5. Generate Response (Streaming)
    const selectedModel = model || "gemini-2.5-flash";

    // Retry logic for 503/429 errors
    let retries = 3;
    let result;

    while (retries > 0) {
      try {
        result = await ai.models.generateContentStream({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: message }] }],
          config: { systemInstruction },
        });
        break;
      } catch (error: any) {
        if ((error.status === 503 || error.status === 429) && retries > 1) {
          retries--;
          const delay = (4 - retries) * 3000;
          console.log(`Model ${selectedModel} unavailable (${error.status}), retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          const msg = error?.message || 'Model error';
          res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
          res.end();
          return;
        }
      }
    }

    let fullResponse = '';

    for await (const chunk of result) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullResponse += chunkText;
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }
    }

    // 6. Save Assistant Message
    db.addMessage(chatId, 'assistant', fullResponse);
    
    // 7. Send Citations - only include chunks actually cited in the response
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
    const sortedCitedNumbers = [...citedNumbers].sort((a, b) => a - b);

    const sources = chunksToShow
      .map((c, idx) => {
        const doc = db.getDocument(c.metadata.document_id) as any;
        const chunkText = c.metadata.text;

        const sentences = chunkText.split(/(?<=[.!?])\s+/).filter((s: string) => s.trim().length > 10);
        let bestSentence = sentences[0] || chunkText;
        let bestScore = 0;
        for (const sentence of sentences) {
          const score = questionWords.filter((w: string) => sentence.toLowerCase().includes(w)).length;
          if (score > bestScore) { bestScore = score; bestSentence = sentence; }
        }

        // Skip this source entirely if no query words found in the chunk
        if (bestScore === 0) return null;

        return {
          citation_number: citedNumbers.size > 0 ? sortedCitedNumbers[idx] : idx + 1,
          file_name: doc?.original_name || 'Unknown',
          document_id: c.metadata.document_id,
          page_number: c.metadata.page_number,
          chunk_id: c.id,
          text: bestSentence.trim(),
          preview: bestSentence.trim(),
          confidence: Math.round(c.score * 100)
        };
      })
      .filter(Boolean);
    
    res.write(`data: ${JSON.stringify({ sources })}\n\n`);
    res.end();
  },

  async generateEmbedding(text: string): Promise<number[]> {
    const embedding = new Array(768).fill(0);
    const words = text.toLowerCase().split(/\s+/).slice(0, 100);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      for (let j = 0; j < word.length; j++) {
        const charCode = word.charCodeAt(j);
        const index = (charCode * (i + 1) * (j + 1)) % 768;
        embedding[index] += 1 / (i + 1);
      }
    }
    
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }
};
