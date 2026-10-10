import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { generateEmbedding } from './embedding';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export const ingestionService = {
  async processDocument(file: Express.Multer.File, userId?: string): Promise<string> {
    const documentId = uuidv4();
    const filePath = file.path;

    try {
      // 1. Store metadata in DB
      db.createDocument(documentId, file.filename, file.originalname, userId);

      // 2. Extract Text
      const pages = await this.extractTextFromPDF(filePath);

      // 3. Chunk Text
      const chunks = this.chunkPages(pages);
      if (chunks.length === 0) {
        throw new Error('No extractable text found in this PDF (it may be a scanned image).');
      }

      // 4. Generate Embeddings & Store (atomic per chunk insert; rollback on full failure)
      const BATCH_SIZE = 5;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (chunk) => {
          const embedding = generateEmbedding(chunk.text);
          const chunkId = uuidv4();
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
        }));
      }

      return documentId;
    } catch (e: any) {
      try {
        db.deleteDocument(documentId);
      } catch {}
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {}
      throw e;
    }
  },

  async extractTextFromPDF(filePath: string): Promise<{ pageNumber: number; text: string }[]> {
    const dataBuffer = await fs.promises.readFile(filePath);
    const uint8Array = new Uint8Array(dataBuffer);

    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useSystemFonts: true,
      // Disable worker for Node environment to avoid worker file issues
      disableFontFace: true,
    });

    let pdfDocument: any;
    try {
      pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;
      const pages: { pageNumber: number; text: string }[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(' ');
        pages.push({ pageNumber: i, text });
        page.cleanup();
      }

      return pages;
    } finally {
      // Release the document/worker whether extraction succeeded or failed.
      try {
        if (pdfDocument) await pdfDocument.destroy();
        else await loadingTask.destroy();
      } catch {}
    }
  },

  chunkPages(pages: { pageNumber: number; text: string }[]): { text: string; pageNumber: number; chunkIndex: number; charStartPos: number; charEndPos: number }[] {
    const chunks: { text: string; pageNumber: number; chunkIndex: number; charStartPos: number; charEndPos: number }[] = [];
    const CHUNK_SIZE = 1000; // Characters roughly
    const OVERLAP = 100;

    let globalChunkIndex = 0;

    for (const page of pages) {
      const text = page.text;
      // Skip pages with no extractable text (blank pages, image-only pages).
      if (!text || !text.trim()) continue;

      if (text.length <= CHUNK_SIZE) {
        chunks.push({ text, pageNumber: page.pageNumber, chunkIndex: globalChunkIndex++, charStartPos: 0, charEndPos: text.length });
        continue;
      }

      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE, text.length);
        const chunkText = text.slice(start, end);
        // Skip whitespace-only tails (e.g. the final overlap window).
        if (chunkText.trim().length > 0) {
          chunks.push({ 
            text: chunkText, 
            pageNumber: page.pageNumber, 
            chunkIndex: globalChunkIndex++, 
            charStartPos: start,
            charEndPos: end
          });
        }
        start += (CHUNK_SIZE - OVERLAP);
      }
    }

    return chunks;
  }
};
