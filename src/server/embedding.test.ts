import { describe, it, expect } from 'vitest';
import {
  generateEmbedding,
  generateLexicalEmbedding,
  EMBEDDING_DIM,
  EMBEDDING_VERSION,
} from './embedding';
import { cosineSimilarity } from './similarity';

describe('generateLexicalEmbedding', () => {
  it('always returns a unit-length vector of the fixed dimension', () => {
    const v = generateLexicalEmbedding('the quick brown fox jumps over the lazy dog');
    expect(v).toHaveLength(EMBEDDING_DIM);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it('is deterministic', () => {
    expect(generateLexicalEmbedding('machine learning')).toEqual(
      generateLexicalEmbedding('machine learning'),
    );
  });

  it('returns a zero vector for empty / punctuation-only input', () => {
    expect(generateLexicalEmbedding('')).toEqual(new Array(EMBEDDING_DIM).fill(0));
    expect(generateLexicalEmbedding('!!! ...')).toEqual(
      new Array(EMBEDDING_DIM).fill(0),
    );
  });

  it('ignores punctuation and casing', () => {
    expect(generateLexicalEmbedding('Hello, World!')).toEqual(
      generateLexicalEmbedding('hello world'),
    );
  });

  it('scores related text higher than unrelated text', () => {
    const query = generateLexicalEmbedding('retrieval augmented generation');
    const related = generateLexicalEmbedding(
      'retrieval augmented generation for documents',
    );
    const unrelated = generateLexicalEmbedding('bananas are yellow fruit');
    expect(cosineSimilarity(query, related)).toBeGreaterThan(
      cosineSimilarity(query, unrelated),
    );
  });
});

describe('generateEmbedding', () => {
  it('falls back to lexical embedding when API is unavailable', async () => {
    const v = await generateEmbedding('test document');
    expect(v).toHaveLength(EMBEDDING_DIM);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });
});

describe('EMBEDDING_VERSION', () => {
  it('exposes a positive version constant', () => {
    expect(EMBEDDING_VERSION).toBeGreaterThan(0);
  });
});
