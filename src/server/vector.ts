import { db, type ChunkRow } from './db';
import { cosineSimilarity, keywordMatch } from './similarity';

export interface VectorFilter {
  // Restrict retrieval to these document ids (applied in SQL).
  pdf_ids?: string[];
  // Raw user query used for keyword scoring.
  query?: string;
}

export interface VectorResult {
  id: string;
  score: number;
  metadata: {
    text: string;
    page_number: number;
    pdf_id: string;
    file_name: string;
    keyword_score: number;
  };
}

export interface VectorStore {
  query(vector: number[], topK: number, filter?: VectorFilter): Promise<VectorResult[]>;
  invalidate(): void;
}

// Local SQLite-backed vector store.
class LocalVectorStore implements VectorStore {
  // Parsed embeddings keyed by chunk id. Avoids re-deserializing the JSON blob
  // on every query; cleared whenever the underlying chunks change.
  private embeddingCache = new Map<string, number[]>();

  /** Drop cached parsed embeddings. Call after any chunk insert/update/delete. */
  invalidate(): void {
    this.embeddingCache.clear();
  }

  private parseEmbedding(chunk: ChunkRow): number[] {
    const cached = this.embeddingCache.get(chunk.id);
    if (cached) return cached;

    let vector: number[] = [];
    if (chunk.embedding) {
      try {
        const parsed = JSON.parse(chunk.embedding) as unknown;
        if (Array.isArray(parsed)) vector = parsed as number[];
      } catch {
        // Corrupt row: treat as empty rather than failing the whole query.
        vector = [];
      }
    }
    this.embeddingCache.set(chunk.id, vector);
    return vector;
  }

  async query(vector: number[], topK: number, filter?: VectorFilter): Promise<VectorResult[]> {
    // Scope in SQL so unrelated documents are never loaded.
    let chunks: ChunkRow[];
    if (filter && Array.isArray(filter.pdf_ids)) {
      chunks = db.getChunksByDocumentIds(filter.pdf_ids);
    } else {
      chunks = db.getAllChunks();
    }

    const query = filter?.query || '';
    const results = chunks.map((chunk) => {
      const chunkVector = this.parseEmbedding(chunk);
      const vectorScore = cosineSimilarity(vector, chunkVector);
      const keywordScore = keywordMatch(query, chunk.content);
      // Keyword matching carries the semantic signal here (the embedding is
      // lexical), so it is weighted slightly higher than the vector term.
      const hybridScore = vectorScore * 0.4 + keywordScore * 0.6;

      return {
        id: chunk.id,
        score: hybridScore,
        metadata: {
          text: chunk.content,
          page_number: chunk.page_number,
          pdf_id: chunk.document_id,
          file_name: chunk.file_name,
          keyword_score: Math.round(keywordScore * 100),
        },
      };
    });

    return results
      .sort((a, b) => b.score - a.score)
      .filter((r) => r.metadata.keyword_score > 0 && r.score > 0.15)
      .slice(0, topK);
  }
}

export const vectorStore = new LocalVectorStore();
