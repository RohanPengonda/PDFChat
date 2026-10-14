import { describe, it, expect } from 'vitest';
import { cosineSimilarity, keywordMatch, escapeRegExp } from './similarity';

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('returns 0 for mismatched or empty vectors instead of NaN', () => {
    expect(cosineSimilarity([1, 2], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 0 when either vector has zero magnitude', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});

describe('keywordMatch', () => {
  it('scores exact whole-word matches above substring matches', () => {
    const exact = keywordMatch('cat', 'the cat sat');
    const substring = keywordMatch('cat', 'concatenate');
    expect(exact).toBeGreaterThan(substring);
  });

  it('returns 0 when nothing matches', () => {
    expect(keywordMatch('zebra', 'the cat sat')).toBe(0);
  });

  it('weights earlier query words more heavily', () => {
    const early = keywordMatch('alpha beta', 'alpha present');
    const late = keywordMatch('alpha beta', 'beta present');
    expect(early).toBeGreaterThan(late);
  });

  it('treats regex metacharacters in the query as literals', () => {
    expect(() => keywordMatch('a.*b', 'a.*b text')).not.toThrow();
    expect(keywordMatch('a.*b', 'a.*b')).toBe(1);
  });
});

describe('escapeRegExp', () => {
  it('escapes special characters', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c');
  });
});
