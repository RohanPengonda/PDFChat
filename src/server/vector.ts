import { db, type ChunkRow } from './db';
import { generateEmbedding, EMBEDDING_DIM } from './embedding';
import { cosineSimilarity, keywordMatch } from './similarity';

export interface VectorFilter {
  // Restrict retrieval to these document ids (applied in SQL).
  pdf_ids?: string[];
  // Raw user query used for keyword scoring.
  query?: string;
  // Expanded query terms (synonyms / related terms) used to boost recall.
  expandedQueries?: string[];
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

  // Maximal Marginal Relevance: diversify the top-K so results don't all come
  // from the same paragraph. lambda balances relevance vs diversity (0.7 = more
  // relevance, 0.3 = more diversity).
  private mmr(
    candidates: VectorResult[],
    topK: number,
    lambda = 0.7,
  ): VectorResult[] {
    const selected: VectorResult[] = [];
    const remaining = [...candidates].sort((a, b) => b.score - a.score);

    if (remaining.length === 0) return selected;

    // Always take the single most relevant result first.
    selected.push(remaining.shift()!);

    while (selected.length < topK && remaining.length > 0) {
      let bestIdx = -1;
      let bestMmr = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const cand = remaining[i];
        const candVector = this.parseEmbeddingById(cand.id);
        // Max similarity to anything already selected.
        let maxSim = 0;
        for (const sel of selected) {
          const selVector = this.parseEmbeddingById(sel.id);
          const sim = cosineSimilarity(candVector, selVector);
          if (sim > maxSim) maxSim = sim;
        }
        const mmrScore = lambda * cand.score - (1 - lambda) * maxSim;
        if (mmrScore > bestMmr) {
          bestMmr = mmrScore;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) break;
      selected.push(remaining.splice(bestIdx, 1)[0]);
    }

    return selected;
  }

  // Look up a cached parsed embedding by chunk id. Returns zero vector if not found.
  private parseEmbeddingById(id: string): number[] {
    const cached = this.embeddingCache.get(id);
    if (cached) return cached;
    return new Array(EMBEDDING_DIM).fill(0);
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
    const expandedQueries = filter?.expandedQueries || [];

    // Build per-query vectors: the original query plus any expansions.
    const queryVectors = [vector];
    for (const eq of expandedQueries) {
      if (!eq || eq === query) continue;
      queryVectors.push(this.embedQuery(eq));
    }

    // Score each chunk against every query vector, taking the max (OR semantics
    // for expanded queries improves synonym recall).
    const scored = chunks.map((chunk) => {
      const chunkVector = this.parseEmbedding(chunk);
      let bestVectorScore = 0;
      for (const qv of queryVectors) {
        const sim = cosineSimilarity(qv, chunkVector);
        if (sim > bestVectorScore) bestVectorScore = sim;
      }

      // Keyword match against the original query and all expansions.
      let bestKeywordScore = keywordMatch(query, chunk.content);
      for (const eq of expandedQueries) {
        const s = keywordMatch(eq, chunk.content);
        if (s > bestKeywordScore) bestKeywordScore = s;
      }

      // Reciprocal Rank Fusion style hybrid: combine normalized ranks rather
      // than raw scores so a strong keyword match can't drown out a strong
      // vector match and vice versa. Here we approximate with a tuned weighted
      // sum on the max scores.
      const hybridScore = bestVectorScore * 0.45 + bestKeywordScore * 0.55;

      return {
        id: chunk.id,
        score: hybridScore,
        metadata: {
          text: chunk.content,
          page_number: chunk.page_number,
          pdf_id: chunk.document_id,
          file_name: chunk.file_name,
          keyword_score: Math.round(bestKeywordScore * 100),
        },
      };
    });

    // Diversify with MMR so top-K isn't all from the same paragraph.
    const diversified = this.mmr(scored, topK * 2, 0.7);

    return diversified
      .sort((a, b) => b.score - a.score)
      .filter((r) => r.score > 0.1)
      .slice(0, topK);
  }

  // Embed a short query string on demand for expansion vectors. Reuses the same
  // hashing function as ingestion so vectors stay comparable.
  private embedQuery(text: string): number[] {
    return generateEmbedding(text);
  }
}

export const vectorStore = new LocalVectorStore();
