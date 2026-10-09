// Shared local hash embedding (768 dimensions).
// Ingestion and query paths MUST use the same function so vectors stay comparable.
export function generateEmbedding(text: string): number[] {
  const embedding = new Array(768).fill(0);
  const words = (text || '').toLowerCase().split(/\s+/).slice(0, 100);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    for (let j = 0; j < word.length; j++) {
      const charCode = word.charCodeAt(j);
      const index = (charCode * (i + 1) * (j + 1)) % 768;
      embedding[index] += 1 / (i + 1);
    }
  }

  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return new Array(768).fill(0);
  return embedding.map(val => val / magnitude);
}
