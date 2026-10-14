import { describe, it, expect } from 'vitest';
import { sampleEvenly, safeErrorMessage, SAFE_MESSAGES } from './util';

describe('sampleEvenly', () => {
  it('returns the original list when it is already short enough', () => {
    const items = [1, 2, 3];
    expect(sampleEvenly(items, 5)).toBe(items);
  });

  it('samples roughly evenly across a long list', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const sampled = sampleEvenly(items, 4);
    expect(sampled).toHaveLength(4);
    expect(sampled[0]).toBe(0);
    expect(sampled[3]).toBeGreaterThan(70);
  });

  it('returns [] for a non-positive budget', () => {
    expect(sampleEvenly([1, 2, 3], 0)).toEqual([]);
  });
});

describe('safeErrorMessage', () => {
  it('passes through allow-listed messages', () => {
    const msg = 'Only PDF files are allowed';
    expect(SAFE_MESSAGES.has(msg)).toBe(true);
    expect(safeErrorMessage(msg)).toBe(msg);
  });

  it('hides unknown messages behind a generic error', () => {
    expect(safeErrorMessage('ENOENT: /secret/path')).toBe('Failed to process document.');
    expect(safeErrorMessage(undefined)).toBe('Failed to process document.');
  });
});
