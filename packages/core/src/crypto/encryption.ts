/// <reference lib="dom" />
import type { EncryptedEnvelope } from '../types';

const AES_ALGO = { name: 'AES-GCM', length: 256 } as const;
const IV_LENGTH_BYTES = 12;

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  if (view.buffer instanceof ArrayBuffer) {
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }
  const copy = new Uint8Array(view);
  return copy.buffer;
}

export function getCrypto(): Crypto {
  if (typeof globalThis.crypto !== 'undefined') {
    return globalThis.crypto as Crypto;
  }
  throw new Error('Web Crypto API is not available in this environment');
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateAesKey(): Promise<CryptoKey> {
  const crypto = getCrypto();
  return crypto.subtle.generateKey(AES_ALGO, true, ['encrypt', 'decrypt']);
}

export async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  const crypto = getCrypto();
  const rawBuffer = toArrayBuffer(raw);
  return crypto.subtle.importKey('raw', rawBuffer, AES_ALGO, true, ['encrypt', 'decrypt']);
}

export async function exportAesKey(key: CryptoKey): Promise<Uint8Array> {
  const crypto = getCrypto();
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

function toIv(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength === IV_LENGTH_BYTES) return bytes;
  const trimmed = bytes.slice(0, IV_LENGTH_BYTES);
  const result = new Uint8Array(IV_LENGTH_BYTES);
  result.set(trimmed);
  return result;
}

export async function encryptBytes(value: Uint8Array, key: CryptoKey): Promise<EncryptedEnvelope> {
  const crypto = getCrypto();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const valueBuffer = toArrayBuffer(value);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, valueBuffer);
  return {
    ct: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    v: 1,
  };
}

export async function decryptBytes(envelope: EncryptedEnvelope, key: CryptoKey): Promise<Uint8Array> {
  const crypto = getCrypto();
  const ivBytes = fromBase64(envelope.iv);
  const cipherBytes = fromBase64(envelope.ct);
  const cipherBuffer: ArrayBuffer = toArrayBuffer(cipherBytes);
  const ivSource: ArrayBuffer = toArrayBuffer(toIv(ivBytes));
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivSource }, key, cipherBuffer);
  return new Uint8Array(plainBuffer);
}

export async function encryptString(value: string, key: CryptoKey): Promise<EncryptedEnvelope> {
  const encoder = new TextEncoder();
  return encryptBytes(encoder.encode(value), key);
}

export async function decryptString(envelope: EncryptedEnvelope, key: CryptoKey): Promise<string> {
  const decoder = new TextDecoder();
  const bytes = await decryptBytes(envelope, key);
  return decoder.decode(bytes);
}

export function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.ct === 'string' && typeof candidate.iv === 'string' && typeof candidate.v === 'number';
}
