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

    // 3. Retrieve Context
    const filter = documentIds && documentIds.length > 0 ? { document_ids: documentIds } : undefined;
    const relevantChunks = await vectorStore.query(queryVector, 5, filter);

    // 4. Construct Prompt
    const contextText = relevantChunks.map(chunk => 
      `[File: ${chunk.metadata.document_id} | Page: ${chunk.metadata.page_number}] ${chunk.metadata.text}`
    ).join('\n\n');

    const systemInstruction = `You are a helpful document assistant. Answer questions based on the provided context.

IMPORTANT INSTRUCTIONS:
- If the context contains relevant information, provide a clear answer and say "Please check the citations below for more details."
- If the context does NOT contain the answer, say "The provided document does not contain information about this topic."
- NEVER say "I do not know" - either answer from context or say the document doesn't contain the information.
- Be concise and direct.
- Always reference page numbers when answering.
    
Context:
${contextText}
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
    
    // 7. Send Citations
    const sources = relevantChunks.map(c => {
      const doc = db.getDocument(c.metadata.document_id) as any;
      
      // Extract most relevant sentence from chunk that matches answer context
      let excerptText = c.metadata.text;
      
      // If text is longer than 150 chars, try to find a complete sentence
      if (excerptText.length > 150) {
        const sentences = excerptText.split(/[.!?]+/);
        let selectedSentence = sentences[0] || excerptText.substring(0, 150);
        
        // Try to find a sentence that contains key question words
        const questionWords = message.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        for (const sentence of sentences) {
          if (questionWords.some(word => sentence.toLowerCase().includes(word))) {
            selectedSentence = sentence;
            break;
          }
        }
        excerptText = selectedSentence.trim().substring(0, 200);
      }
      
      return {
        file_name: doc?.original_name || 'Unknown',
        document_id: c.metadata.document_id,
        page_number: c.metadata.page_number,
        chunk_id: c.id,
        text: excerptText
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
