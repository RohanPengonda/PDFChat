// Page-aware text chunking, kept pure so it can be unit-tested without a PDF.

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface TextChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
  charStartPos: number;
  charEndPos: number;
}

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 100;

export function chunkPages(pages: PageText[]): TextChunk[] {
  const chunks: TextChunk[] = [];
  let globalChunkIndex = 0;

  for (const page of pages) {
    const text = page.text;
    // Skip pages with no extractable text (blank pages, image-only pages).
    if (!text || !text.trim()) continue;

    if (text.length <= CHUNK_SIZE) {
      chunks.push({
        text,
        pageNumber: page.pageNumber,
        chunkIndex: globalChunkIndex++,
        charStartPos: 0,
        charEndPos: text.length,
      });
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
          charEndPos: end,
        });
      }
      start += CHUNK_SIZE - CHUNK_OVERLAP;
    }
  }

  return chunks;
}
