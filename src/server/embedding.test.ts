import { describe, it, expect } from 'vitest';
import { generateEmbedding, EMBEDDING_DIM, EMBEDDING_VERSION } from './embedding';
import { cosineSimilarity } from './similarity';

describe('generateEmbedding', () => {
  it('always returns a unit-length vector of the fixed dimension', () => {
    const v = generateEmbedding('the quick brown fox jumps over the lazy dog');
    expect(v).toHaveLength(EMBEDDING_DIM);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });

  it('is deterministic', () => {
    expect(generateEmbedding('machine learning')).toEqual(generateEmbedding('machine learning'));
  });

  it('returns a zero vector for empty / punctuation-only input', () => {
    expect(generateEmbedding('')).toEqual(new Array(EMBEDDING_DIM).fill(0));
    expect(generateEmbedding('!!! ...')).toEqual(new Array(EMBEDDING_DIM).fill(0));
  });

  it('ignores punctuation and casing', () => {
    expect(generateEmbedding('Hello, World!')).toEqual(generateEmbedding('hello world'));
  });

  it('scores related text higher than unrelated text', () => {
    const query = generateEmbedding('retrieval augmented generation');
    const related = generateEmbedding('retrieval augmented generation for documents');
    const unrelated = generateEmbedding('bananas are yellow fruit');
    expect(cosineSimilarity(query, related)).toBeGreaterThan(
      cosineSimilarity(query, unrelated),
    );
  });

  it('exposes a positive version constant', () => {
    expect(EMBEDDING_VERSION).toBeGreaterThan(0);
  });
});
