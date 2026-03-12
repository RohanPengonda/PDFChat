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

    // 4. Construct Prompt
    const contextText = relevantChunks.map(chunk => 
      `[File: ${chunk.metadata.document_id} | Page: ${chunk.metadata.page_number}] ${chunk.metadata.text}`
    ).join('\n\n');

    const systemInstruction = `You are a helpful document assistant. Answer questions based on the provided context.

IMPORTANT INSTRUCTIONS:
- Provide clear, direct answers based on the context.
- Use inline citations [1], [2], [3] etc. to reference sources in order.
- Place citations immediately after the relevant sentence or fact.
- If the context contains relevant information, answer it clearly.
- If the context does NOT contain the answer, say "The provided document does not contain information about this topic."
- Be concise and accurate.

Example format:
State in React is an object that holds data [1]. It can be updated using setState() [2].
    
Context:
${contextText.split('\n\n').map((chunk, idx) => `[${idx + 1}] ${chunk}`).join('\n\n')}
`;

    // 5. Generate Response (Streaming)
    const selectedModel = model || "gemini-2.5-flash";
    
    // Retry logic for 503 errors
    let retries = 3;
    let result;
    
    while (retries > 0) {
      try {
        result = await ai.models.generateContentStream({
          model: selectedModel,
          contents: [{ role: "user", parts: [{ text: message }] }],
          config: {
            systemInstruction: systemInstruction
          }
        });
        break; // Success, exit retry loop
      } catch (error: any) {
        if (error.status === 503 && retries > 1) {
          retries--;
          const delay = (4 - retries) * 2000; // 2s, 4s, 6s
          console.log(`Model ${selectedModel} unavailable, retrying in ${delay/1000}s... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error; // Give up or different error
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
    
    // 7. Send Citations with Smart Answer Text Extraction
    const sources = relevantChunks.map(c => {
      const doc = db.getDocument(c.metadata.document_id) as any;
      const chunkText = c.metadata.text;
      
      // Strategy 1: Try to find answer text in the chunk by matching response content
      let excerptText = chunkText;
      let charStartPos = 0;
      let charEndPos = chunkText.length;
      let confidence = 0;
      
      // Extract first 2-3 sentences from response as search text
      const responseSentences = fullResponse.split(/[.!?]+/).filter(s => s.trim().length > 10).slice(0, 3);
      
      for (const respSentence of responseSentences) {
        const keywords = respSentence
          .toLowerCase()
          .split(/\s+/)
          .filter(w => w.length > 4)
          .slice(0, 3);
        
        // Search chunk for these keywords
        let bestMatch = -1;
        let matchedCount = 0;
        
        for (const keyword of keywords) {
          const idx = chunkText.toLowerCase().indexOf(keyword);
          if (idx !== -1) {
            matchedCount++;
            if (bestMatch === -1 || idx < bestMatch) bestMatch = idx;
          }
        }
        
        if (matchedCount > 0) {
          confidence = matchedCount / keywords.length;
          if (bestMatch !== -1) {
            // Find sentence boundaries around match
            const beforeMatch = chunkText.substring(0, bestMatch).lastIndexOf('.');
            const afterMatch = chunkText.indexOf('.', bestMatch + 100);
            
            charStartPos = beforeMatch !== -1 ? beforeMatch + 1 : 0;
            charEndPos = afterMatch !== -1 ? afterMatch + 1 : Math.min(bestMatch + 250, chunkText.length);
            excerptText = chunkText.substring(charStartPos, charEndPos).trim();
            break;
          }
        }
      }
      
      // Fallback: If no good match found, extract first relevant sentence
      if (confidence === 0 || excerptText.length < 20) {
        const sentences = chunkText.split(/[.!?]+/);
        const questionWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        
        let bestSentence = sentences[0] || chunkText.substring(0, 150);
        for (const sentence of sentences) {
          if (questionWords.some(word => sentence.toLowerCase().includes(word))) {
            bestSentence = sentence;
            confidence = 0.5;
            break;
          }
        }
        excerptText = bestSentence.trim().substring(0, 300);
      }
      
      // Ensure we have valid text
      if (!excerptText || excerptText.length < 10) {
        excerptText = chunkText.substring(0, Math.min(200, chunkText.length));
      }
      
      return {
        file_name: doc?.original_name || 'Unknown',
        document_id: c.metadata.document_id,
        page_number: c.metadata.page_number,
        chunk_id: c.id,
        text: excerptText,
        char_start_pos: charStartPos,
        char_end_pos: charEndPos,
        confidence: Math.round(confidence * 100)
      };
    });
    
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
