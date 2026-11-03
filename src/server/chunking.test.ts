import { describe, it, expect } from 'vitest';
import { chunkPages, CHUNK_SIZE, CHUNK_OVERLAP } from './chunking';

describe('chunkPages', () => {
  it('keeps a short page as a single chunk', () => {
    const chunks = chunkPages([{ pageNumber: 1, text: 'hello world' }]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('hello world');
    expect(chunks[0].pageNumber).toBe(1);
    expect(chunks[0].charStartPos).toBe(0);
    expect(chunks[0].charEndPos).toBe('hello world'.length);
  });

  it('skips empty / whitespace-only pages', () => {
    const chunks = chunkPages([
      { pageNumber: 1, text: '' },
      { pageNumber: 2, text: '   \n  ' },
    ]);
    expect(chunks).toHaveLength(0);
  });

  it('splits long pages with the configured overlap', () => {
    const text = 'a'.repeat(CHUNK_SIZE + 500);
    const chunks = chunkPages([{ pageNumber: 3, text }]);
    expect(chunks.length).toBeGreaterThan(1);
    // Second chunk must start before the first ends (overlap).
    expect(chunks[1].charStartPos).toBe(CHUNK_SIZE - CHUNK_OVERLAP);
    expect(chunks[1].pageNumber).toBe(3);
  });

  it('splits long pages containing sentence boundaries without hanging', () => {
    // Real prose contains sentence-ending punctuation; the split search must
    // walk past the first boundary instead of looping forever on it.
    const text = [
      'The quick brown fox jumps over the lazy dog. '.repeat(30),
      'Here are some more words that keep on going without stopping at all.',
    ].join('');
    expect(text.length).toBeGreaterThan(CHUNK_SIZE);
    const chunks = chunkPages([{ pageNumber: 2, text }]);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].charEndPos).toBeLessThanOrEqual(text.length);
  });

  it('assigns globally increasing chunk indices across pages', () => {
    const chunks = chunkPages([
      { pageNumber: 1, text: 'first page' },
      { pageNumber: 2, text: 'second page' },
    ]);
    expect(chunks.map((c) => c.chunkIndex)).toEqual([0, 1]);
  });
});
