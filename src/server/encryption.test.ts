import { describe, it, expect } from 'vitest';
import { encryptText, decryptText, decryptTextLoose, encryptTextLoose } from './encryption';

describe('encryption', () => {
  it('round-trips plain text', () => {
    const enc = encryptText('hello world');
    expect(typeof enc).toBe('string');
    expect(decryptText(enc)).toBe('hello world');
  });

  it('produces unique ciphertexts for identical plaintext', () => {
    expect(encryptText('same-value')).not.toBe(encryptText('same-value'));
  });

  it('falls back to the raw value for legacy plaintext', () => {
    expect(decryptTextLoose('legacy-plain-text')).toBe('legacy-plain-text');
  });

  it('passes null through for nullable fields', () => {
    expect(encryptTextLoose(null)).toBeNull();
    expect(decryptTextLoose(null)).toBeNull();
  });
});
