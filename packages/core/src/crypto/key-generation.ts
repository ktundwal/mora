/// <reference lib="dom" />
import { exportAesKey, generateAesKey, getCrypto, importAesKey } from './encryption';
import { entropyToPhrase, phraseToEntropy, normalizeWords } from './recovery-phrase';

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = 'SHA-256';

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  if (view.buffer instanceof ArrayBuffer) {
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }
  const copy = new Uint8Array(view);
  return copy.buffer;
}

export async function generateMasterKey(): Promise<CryptoKey> {
  return generateAesKey();
}

export async function masterKeyToRecoveryPhrase(key: CryptoKey): Promise<string[]> {
  const keyBytes = await exportAesKey(key);
  return entropyToPhrase(keyBytes);
}

export async function recoveryPhraseToMasterKey(words: string[]): Promise<CryptoKey> {
  const normalized = normalizeWords(words);
  const entropy = phraseToEntropy(normalized);
  return importAesKey(entropy);
}

export function generateRandomBytes(length: number): Uint8Array {
  const crypto = getCrypto();
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const saltBuffer = toArrayBuffer(salt);
  const passphraseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH,
    },
    passphraseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function hashSha256(value: string): Promise<string> {
  const crypto = getCrypto();
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(PBKDF2_HASH, encoder.encode(value));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
