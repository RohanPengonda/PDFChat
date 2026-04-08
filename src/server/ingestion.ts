import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { vectorStore } from './vector';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const ingestionService = {
  async processDocument(file: Express.Multer.File): Promise<string> {
    const documentId = uuidv4();
    const filePath = file.path;

    // 1. Store metadata in DB
    db.createDocument(documentId, file.filename, file.originalname);

    // 2. Extract Text
    const pages = await this.extractTextFromPDF(filePath);

    // 3. Chunk Text
    const chunks = this.chunkPages(pages);

    // 4. Generate Embeddings & Store
    // Process in batches to avoid hitting API limits
    const BATCH_SIZE = 5; // Reduced batch size
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (chunk) => {
        try {
            const embedding = await this.generateEmbedding(chunk.text);
            
            const chunkId = uuidv4();
            
            // Store in SQL DB with character positions
            db.createChunk(
              chunkId, 
              documentId, 
              chunk.text, 
              chunk.pageNumber, 
              chunk.chunkIndex, 
              embedding,
              chunk.charStartPos,
              chunk.charEndPos
            );

            // Store in Vector DB
            await vectorStore.addVectors([{
              id: chunkId,
              values: embedding,
              metadata: {
                document_id: documentId,
                page_number: chunk.pageNumber,
                text: chunk.text,
                char_start_pos: chunk.charStartPos,
                char_end_pos: chunk.charEndPos
              }
            }]);
        } catch (e) {
            console.error(`Failed to process chunk ${chunk.chunkIndex} for doc ${documentId}`, e);
        }
      }));
    }

    return documentId;
  },

  async extractTextFromPDF(filePath: string): Promise<{ pageNumber: number; text: string }[]> {
    const dataBuffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(dataBuffer);
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      // Disable worker for Node environment to avoid worker file issues
      disableFontFace: true,
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    const pages = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ');
      pages.push({ pageNumber: i, text });
    }

    return pages;
  },

  chunkPages(pages: { pageNumber: number; text: string }[]): { text: string; pageNumber: number; chunkIndex: number; charStartPos: number; charEndPos: number }[] {
    const chunks: { text: string; pageNumber: number; chunkIndex: number; charStartPos: number; charEndPos: number }[] = [];
    const CHUNK_SIZE = 1000; // Characters roughly
    const OVERLAP = 100;

    let globalChunkIndex = 0;

    for (const page of pages) {
      const text = page.text;
      if (text.length <= CHUNK_SIZE) {
        chunks.push({ text, pageNumber: page.pageNumber, chunkIndex: globalChunkIndex++, charStartPos: 0, charEndPos: text.length });
        continue;
      }

      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        const chunkText = text.slice(start, end);
        chunks.push({ 
          text: chunkText, 
          pageNumber: page.pageNumber, 
          chunkIndex: globalChunkIndex++, 
          charStartPos: start,
          charEndPos: end
        });
        start += (CHUNK_SIZE - OVERLAP);
      }
    }

    return chunks;
  },

  async generateEmbedding(text: string): Promise<number[]> {
    // Simple embedding using character-based hashing (768 dimensions)
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
    
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : 0);
  }
};
