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

// Matches sentence-ending punctuation followed by whitespace.
const SENTENCE_BOUNDARY = /[.!?]\s+/;

// Try to split at a sentence boundary near the end of the window so chunks
// don't break mid-sentence. Searches back up to 200 chars from `end`.
function findSentenceSplit(text: string, start: number, end: number): number {
  if (end >= text.length) return end;
  const searchStart = Math.max(start + 50, end - 200);
  const window = text.slice(searchStart, end);
  let best = -1;
  let m: RegExpExecArray | null;
  SENTENCE_BOUNDARY.lastIndex = 0;
  while ((m = SENTENCE_BOUNDARY.exec(window)) !== null) {
    best = searchStart + m.index + m[0].length;
  }
  return best !== -1 ? best : end;
}

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
      let end = Math.min(start + CHUNK_SIZE, text.length);
      if (end < text.length) {
        end = findSentenceSplit(text, start, end);
      }
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
      if (end >= text.length) break;
      // Guarantee forward progress while retaining overlap.
      start = Math.max(start + 1, end - CHUNK_OVERLAP);
    }
  }

  return chunks;
}
