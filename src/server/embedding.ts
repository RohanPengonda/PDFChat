// Shared local lexical embedding (768 dimensions).
//
// NOTE: This is a deterministic, dependency-free *lexical* hasher, not a
// semantic model. It captures word tokens plus character n-grams, skip-grams
// and position features so that morphological variants, typos, partial terms
// and nearby word order share vector mass. It still cannot match true
// synonyms — keyword scoring and query expansion in the vector store compensate.
//
// Ingestion and query paths MUST use the same function AND EMBEDDING_VERSION so
// stored vectors stay comparable. Bumping the version triggers a re-index.
export const EMBEDDING_DIM = 768;

// Bump whenever the algorithm below changes. Stored chunks carrying an older
// version are re-embedded on boot (see ingestionService.reindexIfNeeded).
export const EMBEDDING_VERSION = 3;

// Guard against pathological inputs; real chunks are ~1000 chars.
const MAX_TOKENS = 2000;

// Approximate IDF boost for rarer tokens. Common function words get a lower
// weight so they don't dominate the vector.
const STOP_WORDS = new Set([
  'the','a','an','and','or','but','if','then','else','when','at','from','by',
  'for','with','about','against','between','into','through','during','before',
  'after','above','below','to','of','in','on','is','are','was','were','be',
  'been','being','have','has','had','do','does','did','will','would','could',
  'should','may','might','must','shall','can','this','that','these','those',
  'i','you','he','she','it','we','they','me','him','her','us','them','my',
  'your','his','its','our','their','mine','yours','hers','ours','theirs',
]);

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

  // Token frequency for IDF-like down-weighting of very common tokens.
  const freq = new Map<string, number>();
  for (const t of limited) freq.set(t, (freq.get(t) || 0) + 1);
  const total = limited.length;

  for (let i = 0; i < limited.length; i++) {
    const token = limited[i];
    const count = freq.get(token) || 1;
    // IDF-like weight: rarer tokens contribute more; capped so a single rare
    // token can't swamp the whole vector.
    const idfWeight = Math.min(2, Math.log(total / count) + 0.5);
    const stopPenalty = STOP_WORDS.has(token) ? 0.25 : 1;

    // Whole word.
    addFeature(vec, token, 1 * idfWeight * stopPenalty);

    // Character trigrams capture sub-word / typo similarity.
    if (token.length > 3) {
      for (let j = 0; j <= token.length - 3; j++) {
        addFeature(vec, `tri:${token.slice(j, j + 3)}`, 0.25 * stopPenalty);
      }
    }
    // Character 4-grams for slightly longer sub-word matches.
    if (token.length > 4) {
      for (let j = 0; j <= token.length - 4; j++) {
        addFeature(vec, `quad:${token.slice(j, j + 4)}`, 0.15 * stopPenalty);
      }
    }

    // Word bigrams retain immediate word-order context.
    if (i > 0) {
      addFeature(vec, `bigram:${limited[i - 1]}_${token}`, 0.5 * idfWeight);
    }
    // Skip-bigrams (i and i+2) retain a little more long-range order.
    if (i > 1) {
      addFeature(vec, `skipbigram:${limited[i - 2]}_${token}`, 0.3 * idfWeight);
    }

    // Position features: first and last tokens carry topic signal.
    if (i === 0) addFeature(vec, `first:${token}`, 0.8);
    if (i === limited.length - 1) addFeature(vec, `last:${token}`, 0.8);
  }

  let magnitude = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) magnitude += vec[i] * vec[i];
  magnitude = Math.sqrt(magnitude);
  if (magnitude === 0) return Array.from(vec);

  const out = new Array<number>(EMBEDDING_DIM);
  for (let i = 0; i < EMBEDDING_DIM; i++) out[i] = vec[i] / magnitude;
  return out;
}
