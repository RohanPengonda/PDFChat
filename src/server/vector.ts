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

    if (chunks.length === 0) return [];

    const query = filter?.query || '';
    const expandedQueries = filter?.expandedQueries || [];

    // Build SQL-side keyword pre-filter so we don't load every chunk into
    // memory. Split the query into words and match chunks containing any of
    // them. If nothing matches, fall back to all chunks (semantic-only search).
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);
    let sqlFilteredChunks: ChunkRow[] | null = null;
    if (queryWords.length > 0) {
      const conditions = queryWords.map(() => 'LOWER(content) LIKE ?').join(' OR ');
      const params = queryWords.map((w) => `%` + w + `%`);
      try {
        const likeChunks = (filter && Array.isArray(filter.pdf_ids)
          ? db.getChunksByDocumentIdsLike(filter.pdf_ids, conditions, params)
          : db.getAllChunksLike(conditions, params)) as ChunkRow[];
        if (likeChunks.length > 0) sqlFilteredChunks = likeChunks;
      } catch {
        // Fall through to all chunks if LIKE query fails.
      }
    }
    chunks = sqlFilteredChunks ?? chunks;

    // Build per-query vectors: the original query plus any expansions.
    const queryVectors = [vector];
    for (const eq of expandedQueries) {
      if (!eq || eq === query) continue;
      queryVectors.push(await this.embedQuery(eq));
    }

    // Compute keyword scores for all loaded chunks (cheap string ops).
    const keywordScores = new Map<string, number>();
    for (const chunk of chunks) {
      let bestKw = keywordMatch(query, chunk.content);
      for (const eq of expandedQueries) {
        const s = keywordMatch(eq, chunk.content);
        if (s > bestKw) bestKw = s;
      }
      keywordScores.set(chunk.id, bestKw);
    }

    // Keyword pre-filter: select a bounded candidate pool for the expensive
    // cosine computation. Chunks outside the pool get vectorScore = 0 so they
    // can still rank on keyword alone but don't pay the O(n) cosine cost.
    const candidateLimit = Math.min(chunks.length, Math.max(topK * 20, 100));
    const sortedByKeyword = [...chunks].sort(
      (a, b) => (keywordScores.get(b.id) || 0) - (keywordScores.get(a.id) || 0)
    );
    const candidateIds = new Set(
      sortedByKeyword.slice(0, candidateLimit).map((c) => c.id)
    );

    // Score each chunk: cosine only for candidates, keyword for all.
    const scored = chunks.map((chunk) => {
      const chunkVector = this.parseEmbedding(chunk);
      let bestVectorScore = 0;
      if (candidateIds.has(chunk.id)) {
        for (const qv of queryVectors) {
          const sim = cosineSimilarity(qv, chunkVector);
          if (sim > bestVectorScore) bestVectorScore = sim;
        }
      }
      const kw = keywordScores.get(chunk.id) || 0;
      const hybridScore = bestVectorScore * 0.45 + kw * 0.55;

      return {
        id: chunk.id,
        score: hybridScore,
        metadata: {
          text: chunk.content,
          page_number: chunk.page_number,
          pdf_id: chunk.document_id,
          file_name: chunk.file_name,
          keyword_score: Math.round(kw * 100),
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
  private async embedQuery(text: string): Promise<number[]> {
    return generateEmbedding(text);
  }
}

export const vectorStore = new LocalVectorStore();
