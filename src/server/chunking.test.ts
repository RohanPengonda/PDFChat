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

  it('assigns globally increasing chunk indices across pages', () => {
    const chunks = chunkPages([
      { pageNumber: 1, text: 'first page' },
      { pageNumber: 2, text: 'second page' },
    ]);
    expect(chunks.map((c) => c.chunkIndex)).toEqual([0, 1]);
  });
});
