'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { doc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
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
  hasPassphrase: boolean;
  generateAndStoreKey: (passphrase?: string) => Promise<string[]>;
  recoverWithPhrase: (phrase: string[], passphrase?: string) => Promise<void>;
  unlockWithPassphrase: (passphrase: string) => Promise<void>;
  updateDevicePassphrase: (passphrase?: string) => Promise<void>;
  clearLocalKey: () => Promise<void>;
  revealRecoveryPhrase: () => Promise<string[]>;
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
  const [hasPassphrase, setHasPassphrase] = useState(false);
  const loadedUidRef = useRef<string | null>(null);

  // Helper to expose phrase if key is loaded
  const revealRecoveryPhrase = async (): Promise<string[]> => {
    if (!masterKey) throw new Error('Key not loaded');
    return masterKeyToRecoveryPhrase(masterKey);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      loadedUidRef.current = null;
      setMasterKey(null);
      setRecoveryPhrase(null);
      setHasPassphrase(false);
      setActiveCryptoKey(null);
      setStatus('missing');
      return;
    }

    // If we already loaded for this user, don't re-run logic that might lock the session
    if (loadedUidRef.current === user.uid) {
      return;
    }

    const load = async () => {
      loadedUidRef.current = user.uid;
      setStatus('loading');
      try {
        const record = await getDeviceKey(user.uid);
        if (!record) {
          setStatus('missing');
          setActiveCryptoKey(null);
          setMasterKey(null);
          setHasPassphrase(false);
          return;
        }

        setHasPassphrase(record.passphraseRequired);

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

    // SAFETY CHECK: Prevent overwriting existing keys
    const db = getFirebaseDb();
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists() && userSnap.data().encryptionEnabled) {
      throw new Error('Encryption is already enabled for this account. Please unlock your vault instead of generating a new key.');
    }

    const key = await generateMasterKey();
    const phrase = await masterKeyToRecoveryPhrase(key);
    const record = await createDeviceRecord(user.uid, key, passphrase);

    await saveDeviceKey(record);
    await updateUserKeyMetadata(user.uid, phrase, passphrase ? fromBase64(record.passphraseSalt) : generateRandomBytes(16));

    setMasterKey(key);
    setRecoveryPhrase(phrase);
    setHasPassphrase(!!passphrase);
    setActiveCryptoKey(key);
    setStatus('ready');
    return phrase;
  };

  const recoverWithPhrase = async (phrase: string[], passphrase?: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');

    // SAFETY CHECK: Verify phrase against stored hash to prevent locking out data
    const db = getFirebaseDb();
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.encryptionEnabled && data.recoveryPhraseHash) {
        const inputHash = await hashSha256(phrase.join(' '));
        if (inputHash !== data.recoveryPhraseHash) {
          // TODO: In the future, we might want to allow "force recover" if the user is sure,
          // but for now, this protects against accidental key mismatch.
          throw new Error('Recovery phrase does not match the one used to encrypt your data.');
        }
      }
    }

    const key = await recoveryPhraseToMasterKey(phrase);
    const record = await createDeviceRecord(user.uid, key, passphrase);

    await saveDeviceKey(record);
    // Only update metadata if it's missing or we are sure (which we are, due to check above)
    // Actually, if the hash matches, we don't strictly need to update it, but updating salt/version is fine.
    await updateUserKeyMetadata(user.uid, phrase, passphrase ? fromBase64(record.passphraseSalt) : generateRandomBytes(16));

    setMasterKey(key);
    setActiveCryptoKey(key);
    setHasPassphrase(!!passphrase);
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

  const updateDevicePassphrase = async (passphrase?: string): Promise<void> => {
    if (!user || !masterKey) throw new Error('Key not loaded');
    
    const record = await createDeviceRecord(user.uid, masterKey, passphrase);
    await saveDeviceKey(record);
    setHasPassphrase(!!passphrase);
  };

  const clearLocalKey = async (): Promise<void> => {
    if (!user) return;
    await deleteDeviceKey(user.uid);
    setMasterKey(null);
    setActiveCryptoKey(null);
    setHasPassphrase(false);
    setStatus('missing');
  };

  const value: CryptoContextValue = {
    status,
    masterKey,
    recoveryPhrase,
    hasPassphrase,
    generateAndStoreKey,
    recoverWithPhrase,
    unlockWithPassphrase,
    updateDevicePassphrase,
    clearLocalKey,
    revealRecoveryPhrase,
  };

  return <CryptoContext.Provider value={value}>{children}</CryptoContext.Provider>;
}
