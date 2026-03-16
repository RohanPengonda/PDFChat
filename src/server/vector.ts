import { db } from './db';

export interface VectorStore {
  addVectors(vectors: { id: string; values: number[]; metadata: any }[]): Promise<void>;
  query(vector: number[], topK: number, filter?: any): Promise<{ id: string; score: number; metadata: any }[]>;
}

// Local in-memory / SQLite-based vector store for preview
class LocalVectorStore implements VectorStore {
  async addVectors(vectors: { id: string; values: number[]; metadata: any }[]): Promise<void> {
    // In this local implementation, vectors are already stored in SQLite 'chunks' table by the ingestion service
    // We don't need to do anything extra here if we just scan the DB for queries.
    // However, to be cleaner, we could store them in a separate in-memory structure if performance was key.
    // For now, we'll rely on the DB having them.
    return;
  }

  async query(vector: number[], topK: number, filter?: any): Promise<{ id: string; score: number; metadata: any }[]> {
    // 1. Fetch all chunks from DB
    let chunks = db.getAllChunks();

    if (filter && filter.document_id) {
      chunks = chunks.filter((c: any) => c.document_id === filter.document_id);
    }
    
    if (filter && filter.document_ids && Array.isArray(filter.document_ids)) {
        chunks = chunks.filter((c: any) => filter.document_ids.includes(c.document_id));
    }

    // 2. Hybrid scoring: Combine cosine similarity + keyword matching
    const results = chunks.map((chunk: any) => {
      // Cosine similarity score (0-1)
      const vectorScore = this.cosineSimilarity(vector, chunk.embedding);
      
      // Keyword matching score (0-1)
      const keywordScore = this.keywordMatch(filter?.query || '', chunk.content);
      
      // Hybrid score: 40% vector + 60% keyword (keyword weighted more for better accuracy)
      const hybridScore = (vectorScore * 0.4) + (keywordScore * 0.6);
      
      let fileName = 'Unknown';
      try {
        const doc = db.getDocument(chunk.document_id) as any;
        if (doc && doc.original_name) {
          fileName = doc.original_name;
        }
      } catch (e) {
        console.warn(`Failed to get document ${chunk.document_id} for chunk ${chunk.id}`, e);
      }
      
      return {
        id: chunk.id,
        score: hybridScore,
        metadata: {
          text: chunk.content,
          page_number: chunk.page_number,
          document_id: chunk.document_id,
          chunk_index: chunk.chunk_index,
          file_name: fileName,
          confidence: Math.round(hybridScore * 100),
          vector_score: Math.round(vectorScore * 100),
          keyword_score: Math.round(keywordScore * 100)
        }
      };
    });

    // 3. Sort by hybrid score, require keyword match, filter low-relevance, return top K
    return results
      .sort((a: any, b: any) => b.score - a.score)
      .filter((r: any) => {
        const kw = r.metadata.keyword_score;
        // Must have at least some keyword match AND overall score above threshold
        return kw > 0 && r.score > 0.15;
      })
      .slice(0, topK);
  }

  private keywordMatch(query: string, text: string): number {
    if (!query || !text) return 0;

    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const textLower = text.toLowerCase();

    if (queryWords.length === 0) return 0;

    let matchScore = 0;
    let totalWeight = 0;

    queryWords.forEach((word, idx) => {
      const weight = 1 / (idx + 1);
      totalWeight += weight;
      // Exact whole-word match scores full weight, partial match scores half
      const wordBoundaryRegex = new RegExp(`\\b${word}\\b`);
      if (wordBoundaryRegex.test(textLower)) {
        matchScore += weight;         // exact word boundary match
      } else if (textLower.includes(word)) {
        matchScore += weight * 0.5;   // partial/substring match
      }
    });

    return totalWeight > 0 ? matchScore / totalWeight : 0;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Placeholder for Pinecone - would use @pinecone-database/pinecone
class PineconeVectorStore implements VectorStore {
  async addVectors(vectors: { id: string; values: number[]; metadata: any }[]): Promise<void> {
    console.log('Pinecone addVectors called - simulated');
  }
  async query(vector: number[], topK: number, filter?: any): Promise<{ id: string; score: number; metadata: any }[]> {
    console.log('Pinecone query called - simulated');
    return [];
  }
}

export const vectorStore = new LocalVectorStore();
