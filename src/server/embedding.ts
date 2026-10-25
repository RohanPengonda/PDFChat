// Shared embedding layer (768 dimensions).
//
// Two algorithms are available:
//
// 1. Semantic (primary): Google Gemini text-embedding-004 via the already-installed
//    @google/genai SDK. Real semantic matching — synonyms and related concepts share
//    vector space. Requires a network call and GEMINI_API_KEY.
//
// 2. Lexical (fallback): deterministic, dependency-free hasher over word tokens plus
//    character n-grams, skip-grams and position features. Always works offline but
//    cannot match true synonyms.
//
// The semantic embedding is used whenever the API is available; the lexical hasher is
// the fallback on any API failure so the app never loses search entirely.
//
// Ingestion and query paths MUST use the same function AND EMBEDDING_VERSION so
// stored vectors stay comparable. Bumping the version triggers a re-index.

import { GoogleGenAI } from '@google/genai';

export const EMBEDDING_DIM = 768;

export const EMBEDDING_VERSION = 4;

const SEMANTIC_MODEL = 'text-embedding-004';

let semanticAi: GoogleGenAI | undefined;

// In-memory cache for query embeddings so repeated questions don't hit the
// Gemini API again. Keyed by the normalized text.
const embeddingCache = new Map<string, number[]>();
const EMBEDDING_CACHE_MAX = 500;

function getSemanticAi(): GoogleGenAI | undefined {
  if (!process.env.GEMINI_API_KEY) return undefined;
  if (!semanticAi) {
    semanticAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return semanticAi;
}

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
  const sign = (h & 0x80000000) === 0 ? 1 : -1;
  vec[idx] += sign * weight;
}

// ---- Lexical hasher (fallback, always available) ----

function generateLexicalEmbedding(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  if (!text) return Array.from(vec);

  const tokens = text.toLowerCase().match(/[a-z0-9]+/g);
  if (!tokens || tokens.length === 0) return Array.from(vec);

  const limited = tokens.length > MAX_TOKENS ? tokens.slice(0, MAX_TOKENS) : tokens;

  const freq = new Map<string, number>();
  for (const t of limited) freq.set(t, (freq.get(t) || 0) + 1);
  const total = limited.length;

  const STOP_WORDS = new Set([
    'the','a','an','and','or','but','if','then','else','when','at','from','by',
    'for','with','about','against','between','into','through','during','before',
    'after','above','below','to','of','in','on','is','are','was','were','be',
    'been','being','have','has','had','do','does','did','will','would','could',
    'should','may','might','must','shall','can','this','that','these','those',
    'i','you','he','she','it','we','they','me','him','her','us','them','my',
    'your','his','its','our','their','mine','yours','hers','ours','theirs',
  ]);

  for (let i = 0; i < limited.length; i++) {
    const token = limited[i];
    const count = freq.get(token) || 1;
    const idfWeight = Math.min(2, Math.log(total / count) + 0.5);
    const stopPenalty = STOP_WORDS.has(token) ? 0.25 : 1;

    addFeature(vec, token, 1 * idfWeight * stopPenalty);

    if (token.length > 3) {
      for (let j = 0; j <= token.length - 3; j++) {
        addFeature(vec, `tri:${token.slice(j, j + 3)}`, 0.25 * stopPenalty);
      }
    }
    if (token.length > 4) {
      for (let j = 0; j <= token.length - 4; j++) {
        addFeature(vec, `quad:${token.slice(j, j + 4)}`, 0.15 * stopPenalty);
      }
    }

    if (i > 0) {
      addFeature(vec, `bigram:${limited[i - 1]}_${token}`, 0.5 * idfWeight);
    }
    if (i > 1) {
      addFeature(vec, `skipbigram:${limited[i - 2]}_${token}`, 0.3 * idfWeight);
    }

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

// ---- Semantic embedding via Gemini API ----

function normalizeVector(values: number[]): number[] {
  const mag = Math.sqrt(values.reduce((s, v) => s + v * v, 0));
  if (mag === 0) return values;
  return values.map((v) => v / mag);
}

export async function generateSemanticEmbedding(text: string): Promise<number[]> {
  if (!text) return new Array(EMBEDDING_DIM).fill(0);

  const cacheKey = text.toLowerCase().trim();
  const cached = embeddingCache.get(cacheKey);
  if (cached) return cached;

  const ai = getSemanticAi();
  if (ai) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await ai.models.embedContent({
          model: SEMANTIC_MODEL,
          contents: [{ role: 'user', parts: [{ text }] }],
        });
        const values = result.embeddings?.[0]?.values;
        if (Array.isArray(values) && values.length === EMBEDDING_DIM) {
          const normalized = normalizeVector(values);
          // Cache the result, evicting oldest entries if over cap.
          if (embeddingCache.size >= EMBEDDING_CACHE_MAX) {
            const firstKey = embeddingCache.keys().next().value;
            if (firstKey !== undefined) embeddingCache.delete(firstKey);
          }
          embeddingCache.set(cacheKey, normalized);
          return normalized;
        }
      } catch (error) {
        const err = error as { status?: number; message?: string };
        const retryable = err?.status === 503 || err?.status === 429;
        if (!retryable || attempt === 2) break;
        await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000));
      }
    }
    // Fall through to lexical on any failure.
  }
  return generateLexicalEmbedding(text);
}

// Unified entry point: tries semantic first, falls back to lexical on any failure.
// Callers that need sync behavior should use generateLexicalEmbedding directly.
export async function generateEmbedding(text: string): Promise<number[]> {
  return generateSemanticEmbedding(text);
}

// Sync lexical embedding, kept for callers that cannot await (e.g. tests).
export { generateLexicalEmbedding };

// Clear the embedding query cache. Call when the embedding algorithm version
// changes so stale cached vectors are not reused.
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}
