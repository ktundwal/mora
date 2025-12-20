/// <reference lib="dom" />
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from '@scure/bip39';
import { ENGLISH_WORDLIST } from './wordlist';

// @scure/bip39 exports a readonly wordlist; clone to mutable array to satisfy typings
const WORDLIST: string[] = [...ENGLISH_WORDLIST];

/** Convert raw entropy bytes (16-32 bytes) to a 24-word recovery phrase. */
export function entropyToPhrase(entropy: Uint8Array): string[] {
  const mnemonic = entropyToMnemonic(entropy, WORDLIST);
  return mnemonic.split(' ');
}

/** Convert a 24-word recovery phrase back to entropy bytes. */
export function phraseToEntropy(words: string[]): Uint8Array {
  const normalized = normalizeWords(words);
  const mnemonic = normalized.join(' ');
  if (!validateMnemonic(mnemonic, WORDLIST)) {
    throw new Error('Invalid recovery phrase');
  }
  const entropy = mnemonicToEntropy(mnemonic, WORDLIST);
  return new Uint8Array(entropy);
}

/** Normalize phrase input (trim, lowercase). */
export function normalizeWords(words: string[] | string): string[] {
  if (typeof words === 'string') {
    return words
      .trim()
      .split(/\s+/)
      .map((w) => w.toLowerCase());
  }
  return words.map((w) => w.trim().toLowerCase());
}

/** Quick validation helper. */
export function isValidPhrase(words: string[] | string): boolean {
  try {
    const normalized = normalizeWords(words);
    const mnemonic = normalized.join(' ');
    return validateMnemonic(mnemonic, WORDLIST);
  } catch {
    return false;
  }
}
