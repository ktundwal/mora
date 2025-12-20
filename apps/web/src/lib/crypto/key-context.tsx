'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import { useAuth } from '../auth-context';
import { setActiveCryptoKey } from './active-key';
import { getDeviceKey, saveDeviceKey, deleteDeviceKey } from './key-store';
import type { DeviceKeyStore, EncryptedEnvelope } from '@mora/core';
import {
  deriveKeyFromPassphrase,
  decryptBytes,
  encryptBytes,
  exportAesKey,
  generateMasterKey,
  generateRandomBytes,
  hashSha256,
  masterKeyToRecoveryPhrase,
  recoveryPhraseToMasterKey,
  importAesKey,
} from '@mora/core';

interface CryptoContextValue {
  status: 'loading' | 'missing' | 'locked' | 'ready';
  masterKey: CryptoKey | null;
  recoveryPhrase: string[] | null;
  generateAndStoreKey: (passphrase?: string) => Promise<string[]>;
  recoverWithPhrase: (phrase: string[], passphrase?: string) => Promise<void>;
  unlockWithPassphrase: (passphrase: string) => Promise<void>;
  clearLocalKey: () => Promise<void>;
}

const CryptoContext = createContext<CryptoContextValue | null>(null);

export function useCrypto(): CryptoContextValue {
  const ctx = useContext(CryptoContext);
  if (!ctx) {
    throw new Error('useCrypto must be used within CryptoProvider');
  }
  return ctx;
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

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function updateUserKeyMetadata(uid: string, recoveryPhrase: string[], keySalt: Uint8Array): Promise<void> {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', uid);
  const phraseHash = await hashSha256(recoveryPhrase.join(' '));

  await updateDoc(userRef, {
    encryptionVersion: 1,
    recoveryPhraseHash: phraseHash,
    keySalt: toBase64(keySalt),
    encryptionEnabled: true,
    updatedAt: serverTimestamp(),
  });
}

async function createDeviceRecord(
  uid: string,
  masterKey: CryptoKey,
  passphrase?: string
): Promise<DeviceKeyStore> {
  const masterKeyBytes = await exportAesKey(masterKey);

  if (!passphrase) {
    return {
      uid,
      encryptedMasterKey: toBase64(masterKeyBytes),
      passphraseSalt: '',
      iv: '',
      passphraseRequired: false,
      storedAt: new Date().toISOString(),
    };
  }

  const salt = generateRandomBytes(16);
  const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);
  const envelope = await encryptBytes(masterKeyBytes, derivedKey);

  return {
    uid,
    encryptedMasterKey: envelope.ct,
    iv: envelope.iv,
    passphraseSalt: toBase64(salt),
    passphraseRequired: true,
    storedAt: new Date().toISOString(),
  };
}

async function unlockRecord(record: DeviceKeyStore, passphrase?: string): Promise<CryptoKey> {
  if (record.passphraseRequired) {
    if (!passphrase) {
      throw new Error('Passphrase required to unlock this device');
    }
    const salt = fromBase64(record.passphraseSalt);
    const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);
    const envelope: EncryptedEnvelope = {
      ct: record.encryptedMasterKey,
      iv: record.iv,
      v: 1,
    };
    const plaintext = await decryptBytes(envelope, derivedKey);
    return importAesKey(plaintext);
  }

  const rawBytes = fromBase64(record.encryptedMasterKey);
  return importAesKey(rawBytes);
}

export function CryptoProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<CryptoContextValue['status']>('loading');
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string[] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setMasterKey(null);
      setRecoveryPhrase(null);
      setActiveCryptoKey(null);
      setStatus('missing');
      return;
    }

    const load = async () => {
      setStatus('loading');
      try {
        const record = await getDeviceKey(user.uid);
        if (!record) {
          setStatus('missing');
          setActiveCryptoKey(null);
          setMasterKey(null);
          return;
        }

        if (record.passphraseRequired) {
          setStatus('locked');
          setActiveCryptoKey(null);
          setMasterKey(null);
          return;
        }

        const key = await unlockRecord(record);
        setMasterKey(key);
        setActiveCryptoKey(key);
        setStatus('ready');
      } catch (error) {
        console.error('Failed to load device key:', error);
        setStatus('missing');
      }
    };

    void load();
  }, [authLoading, user]);

  const generateAndStoreKey = async (passphrase?: string): Promise<string[]> => {
    if (!user) throw new Error('Not authenticated');
    const key = await generateMasterKey();
    const phrase = await masterKeyToRecoveryPhrase(key);
    const record = await createDeviceRecord(user.uid, key, passphrase);

    await saveDeviceKey(record);
    await updateUserKeyMetadata(user.uid, phrase, passphrase ? fromBase64(record.passphraseSalt) : generateRandomBytes(16));

    setMasterKey(key);
    setRecoveryPhrase(phrase);
    setActiveCryptoKey(key);
    setStatus('ready');
    return phrase;
  };

  const recoverWithPhrase = async (phrase: string[], passphrase?: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    const key = await recoveryPhraseToMasterKey(phrase);
    const record = await createDeviceRecord(user.uid, key, passphrase);

    await saveDeviceKey(record);
    await updateUserKeyMetadata(user.uid, phrase, passphrase ? fromBase64(record.passphraseSalt) : generateRandomBytes(16));

    setMasterKey(key);
    setActiveCryptoKey(key);
    setStatus(record.passphraseRequired ? 'locked' : 'ready');
  };

  const unlockWithPassphrase = async (passphrase: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    const record = await getDeviceKey(user.uid);
    if (!record) {
      throw new Error('No device key found. Please set up encryption.');
    }
    const key = await unlockRecord(record, passphrase);
    setMasterKey(key);
    setActiveCryptoKey(key);
    setStatus('ready');
  };

  const clearLocalKey = async (): Promise<void> => {
    if (!user) return;
    await deleteDeviceKey(user.uid);
    setMasterKey(null);
    setActiveCryptoKey(null);
    setStatus('missing');
  };

  const value: CryptoContextValue = {
    status,
    masterKey,
    recoveryPhrase,
    generateAndStoreKey,
    recoverWithPhrase,
    unlockWithPassphrase,
    clearLocalKey,
  };

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
}
