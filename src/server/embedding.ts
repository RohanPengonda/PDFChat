// Shared local lexical embedding (768 dimensions).
//
// NOTE: This is a deterministic, dependency-free *lexical* hasher, not a
// semantic model. It captures word tokens plus character n-grams and bigrams so
// that morphological variants, typos and partial terms share vector mass. It
// cannot match true synonyms — keyword scoring in the vector store compensates.
//
// Ingestion and query paths MUST use the same function AND EMBEDDING_VERSION so
// stored vectors stay comparable. Bumping the version triggers a re-index.
export const EMBEDDING_DIM = 768;

// Bump whenever the algorithm below changes. Stored chunks carrying an older
// version are re-embedded on boot (see ingestionService.reindexIfNeeded).
export const EMBEDDING_VERSION = 2;

// Guard against pathological inputs; real chunks are ~1000 chars.
const MAX_TOKENS = 2000;

function fnv1a(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function addFeature(vec: Float64Array, feature: string, weight: number): void {
  const h = fnv1a(feature);
  const idx = h % EMBEDDING_DIM;
  // Derive the sign from a separate high bit so colliding features can cancel
  // rather than always reinforcing each other.
  const sign = (h & 0x80000000) === 0 ? 1 : -1;
  vec[idx] += sign * weight;
}

export function generateEmbedding(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  if (!text) return Array.from(vec);

  // Tokens only (drop punctuation), so "cat," and "cat" hash identically.
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g);
  if (!tokens || tokens.length === 0) return Array.from(vec);

  const limited = tokens.length > MAX_TOKENS ? tokens.slice(0, MAX_TOKENS) : tokens;

  for (let i = 0; i < limited.length; i++) {
    const token = limited[i];

    // Whole word.
    addFeature(vec, token, 1);

    // Character trigrams capture sub-word / typo similarity.
    if (token.length > 3) {
      for (let j = 0; j <= token.length - 3; j++) {
        addFeature(vec, token.slice(j, j + 3), 0.25);
      }
    }

    // Word bigrams retain a little word-order context.
    if (i > 0) {
      addFeature(vec, `${limited[i - 1]}_${token}`, 0.4);
    }
  }

  let magnitude = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) magnitude += vec[i] * vec[i];
  magnitude = Math.sqrt(magnitude);
  if (magnitude === 0) return Array.from(vec);

  const out = new Array<number>(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) out[i] = vec[i] / magnitude;
  return out;
}
