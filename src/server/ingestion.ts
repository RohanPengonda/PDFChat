import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { generateEmbedding, EMBEDDING_VERSION } from './embedding';
import { vectorStore } from './vector';
import { chunkPages, type TextChunk } from './chunking';
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
      const chunks: TextChunk[] = chunkPages(pages);
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

      vectorStore.invalidate();
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

  // Re-embed chunks stored with an older embedding algorithm version. Local and
  // synchronous, so this runs at boot and keeps old libraries searchable.
  reindexIfNeeded(): number {
    const stale = db.getChunksNeedingReindex();
    for (const chunk of stale) {
      db.setChunkEmbedding(chunk.id, generateEmbedding(chunk.content));
    }
    if (stale.length > 0) {
      vectorStore.invalidate();
      console.log(`Re-indexed ${stale.length} chunk(s) with embedding v${EMBEDDING_VERSION}.`);
    }
    return stale.length;
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

  chunkPages,
};
