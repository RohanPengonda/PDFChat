import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// AES-256-GCM encryption for sensitive SQLite fields (documents, chunks,
// chats, messages). SQLCipher was not viable here (native C++ dependency not
// installed), so sensitive values are encrypted in the application layer before
// being written to the database and decrypted on read.

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH_BYTES = 12;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const keyFilePath = path.resolve(__dirname, '../../database.key');

function getKey(): Buffer {
  const fromEnv = process.env.DB_ENCRYPTION_KEY;
  if (fromEnv) {
    const key = Buffer.from(fromEnv, 'base64');
    if (key.length === 32) return key;
  }
  try {
    const stored = fs.readFileSync(keyFilePath, 'utf8').trim();
    const key = Buffer.from(stored, 'base64');
    if (key.length === 32) return key;
  } catch {
    // Key file not found yet; create one below.
  }
  const key = crypto.randomBytes(32);
  try {
    fs.mkdirSync(path.dirname(keyFilePath), { recursive: true });
    fs.writeFileSync(keyFilePath, key.toString('base64'), { mode: 0o600 });
  } catch {
    // Fall back to an in-memory key if the key file is not writable.
  }
  return key;
}

// Encrypt a plain string into a base64 GCM value: [iv (12)][authTag (16)][ciphertext].
export function encryptText(plain: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: 16 });
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

// Decrypt a base64 GCM value back into plain text. Throws when the value is
// not valid encrypted data (e.g. legacy plaintext rows).
export function decryptText(stored: string): string {
  const key = getKey();
  const buf = Buffer.from(stored, 'base64');
  const iv = buf.subarray(0, IV_LENGTH_BYTES);
  const authTag = buf.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + 16);
  const encrypted = buf.subarray(IV_LENGTH_BYTES + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: 16 });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// Decrypt a stored value, falling back to the raw value for legacy plaintext rows.
export function decryptTextLoose(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined) return null;
  try {
    return decryptText(stored);
  } catch {
    return stored;
  }
}

// Encrypt a nullable plain string; null passes through.
export function encryptTextLoose(plain: string | null): string | null {
  if (plain === null || plain === undefined) return null;
  return encryptText(plain);
}
