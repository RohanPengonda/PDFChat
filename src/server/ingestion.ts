import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { generateEmbedding, EMBEDDING_VERSION, clearEmbeddingCache } from './embedding';
import { vectorStore } from './vector';
import { chunkPages, type TextChunk } from './chunking';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Some PDFs lose spaces between words during text extraction (e.g.
// "HereareOOPsinterview" instead of "Here are OOPs interview"). This function
// inserts spaces at common word boundaries so keyword matching and embedding
// work correctly on the extracted text.
function normalizeText(text: string): string {
  if (!text) return text;
  return text
    // Lowercase followed by uppercase: "hereAre" → "here Are"
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Uppercase followed by uppercase+lowercase: "OOPSInterview" → "OOPS Interview"
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    // Letter followed by digit or vice versa: "version2" → "version 2", "2nd" → "2 nd"
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    // Collapse multiple spaces into one
    .replace(/\s+/g, ' ')
    .trim();
}

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
        // Sequential within batch to avoid hammering the embedding API.
        for (const chunk of batch) {
          const embedding = await generateEmbedding(chunk.text);
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
        }
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

  // Re-embed chunks stored with an older embedding algorithm version. Processed
  // in small batches that yield to the event loop so boot maintenance does not
  // block the server from accepting connections. Local and synchronous per chunk.
  async reindexIfNeeded(batchSize = 50): Promise<number> {
    const stale = db.getChunksNeedingReindex();
    let processed = 0;
    for (let i = 0; i < stale.length; i += batchSize) {
      const batch = stale.slice(i, i + batchSize);
      for (const chunk of batch) {
        const embedding = await generateEmbedding(chunk.content);
        db.setChunkEmbedding(chunk.id, embedding);
        processed++;
      }
      // Yield between batches so the event loop can accept connections / handle
      // requests while a large backlog is re-indexed.
      if (i + batchSize < stale.length) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    if (processed > 0) {
      vectorStore.invalidate();
      clearEmbeddingCache();
      console.log(`Re-indexed ${processed} chunk(s) with embedding v${EMBEDDING_VERSION}.`);
    }
    return processed;
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
      // Cap page count to prevent PDF bombs from exhausting memory.
      const MAX_PAGES = 500;
      if (numPages > MAX_PAGES) {
        throw new Error(
          `PDF has too many pages (${numPages}). Maximum is ${MAX_PAGES}.`,
        );
      }
      const pages: { pageNumber: number; text: string }[] = [];

      for (let i = 1; i <= numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        let text = textContent.items.map((item: any) => item.str).join(' ');
        // Some PDFs lose spaces between words (e.g. "HereareOOPsinterview").
        // Insert spaces at word boundaries so keyword matching and embedding
        // work correctly on the extracted text.
        text = normalizeText(text);
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
