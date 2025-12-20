/// <reference lib="dom" />
import type { EncryptedEnvelope } from '../types';
import { decryptString, encryptString, isEncryptedEnvelope } from './encryption';

export type FieldEncoding = 'string' | 'json';

export interface FieldSpec<T extends object> {
  field: keyof T;
  encoding: FieldEncoding;
}

function serializeValue(value: unknown, encoding: FieldEncoding): string {
  if (value === null || value === undefined) return '';
  if (encoding === 'json') return JSON.stringify(value);
  return String(value);
}

function deserializeValue<T>(plaintext: string, encoding: FieldEncoding): T[keyof T] {
  if (encoding === 'json') {
    return JSON.parse(plaintext) as T[keyof T];
  }
  return plaintext as T[keyof T];
}

/**
 * Encrypt specific fields in a document. Non-encrypted fields are copied through.
 */
export async function encryptFields<T extends object>(doc: T, fields: FieldSpec<T>[], key: CryptoKey): Promise<T> {
  const result: Record<string, unknown> = { ...(doc as Record<string, unknown>) };

  for (const spec of fields) {
    const value = doc[spec.field];
    if (value === undefined || value === null) {
      result[spec.field as string] = value as unknown;
      continue;
    }
    const plaintext = serializeValue(value, spec.encoding);
    result[spec.field as string] = await encryptString(plaintext, key);
  }

  return result as T;
}

/**
 * Decrypt specific fields in a document. If field is already plaintext, it is returned as-is.
 */
export async function decryptFields<T extends object>(doc: T, fields: FieldSpec<T>[], key: CryptoKey): Promise<T> {
  const result: Record<string, unknown> = { ...(doc as Record<string, unknown>) };

  for (const spec of fields) {
    const value = doc[spec.field];
    if (value === undefined || value === null) {
      result[spec.field as string] = value as unknown;
      continue;
    }

    if (!isEncryptedEnvelope(value)) {
      result[spec.field as string] = value as unknown;
      continue;
    }

    const plaintext = await decryptString(value, key);
    result[spec.field as string] = deserializeValue<T>(plaintext, spec.encoding);
  }

  return result as T;
}

export function envelopeOrNull(value: unknown): EncryptedEnvelope | null {
  if (isEncryptedEnvelope(value)) return value;
  return null;
}
