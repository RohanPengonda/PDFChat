// Messages we intentionally surface to the client (user-caused failures).
// Anything else is logged server-side and returned as a generic error so
// internal details (paths, stack traces) never leak to the browser.
export const SAFE_MESSAGES = new Set<string>([
  'Only PDF files are allowed',
  'No extractable text found in this PDF (it may be a scanned image).',
  'No content found in this document.',
  'Failed to generate summary',
]);

export function safeErrorMessage(message: unknown): string {
  return typeof message === 'string' && SAFE_MESSAGES.has(message)
    ? message
    : 'Failed to process document.';
}

// Evenly sample up to `max` items across the list so long documents are
// represented end-to-end instead of only from their opening pages.
export function sampleEvenly<T>(items: T[], max: number): T[] {
  if (max <= 0) return [];
  if (items.length <= max) return items;
  const step = items.length / max;
  const sampled: T[] = [];
  for (let i = 0; i < max; i++) {
    sampled.push(items[Math.min(items.length - 1, Math.floor(i * step))]);
  }
  return sampled;
}
