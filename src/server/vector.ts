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
    // 1. Fetch all chunks from DB (or filtered by document_id if filter is present)
    // Optimization: In a real app, use a real vector DB. Here we scan.
    let chunks = db.getAllChunks();

    if (filter && filter.document_id) {
      chunks = chunks.filter((c: any) => c.document_id === filter.document_id);
    }
    
    if (filter && filter.document_ids && Array.isArray(filter.document_ids)) {
        chunks = chunks.filter((c: any) => filter.document_ids.includes(c.document_id));
    }

    // 2. Compute Cosine Similarity
    const results = chunks.map((chunk: any) => {
      const score = this.cosineSimilarity(vector, chunk.embedding);
      return {
        id: chunk.id,
        score,
        metadata: {
          text: chunk.content,
          page_number: chunk.page_number,
          document_id: chunk.document_id,
          chunk_index: chunk.chunk_index
        }
      };
    });

    // 3. Sort and slice
    return results
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, topK);
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
