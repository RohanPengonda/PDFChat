// Pure retrieval scoring helpers, kept free of DB/IO so they can be unit-tested.

export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Weighted keyword overlap (0-1). Earlier query words weigh more (`1/(i+1)`),
// exact whole-word matches score full weight, substring matches half.
export function keywordMatch(query: string, text: string): number {
  if (!query || !text) return 0;

  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  const textLower = text.toLowerCase();
  if (queryWords.length === 0) return 0;

  let matchScore = 0;
  let totalWeight = 0;

  queryWords.forEach((word, idx) => {
    const weight = 1 / (idx + 1);
    totalWeight += weight;
    // Escape the word so regex metacharacters in user input cannot break/abuse it.
    const wordBoundaryRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`);
    if (wordBoundaryRegex.test(textLower)) {
      matchScore += weight;
    } else if (textLower.includes(word)) {
      matchScore += weight * 0.5;
    }
  });

  return totalWeight > 0 ? matchScore / totalWeight : 0;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  // A zero-magnitude vector would otherwise yield NaN and poison the ranking.
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
