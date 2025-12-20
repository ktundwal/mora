import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { PlaybookEntry, PlaybookEntryType } from '@mora/core';
import { CURRENT_SCHEMA_VERSION, encryptFields, decryptFields } from '@mora/core';
import type { FieldSpec } from '@mora/core';
import { getActiveCryptoKey } from '../crypto/active-key';
import { getFirebaseDb } from '../firebase';

export interface CreatePlaybookEntryParams {
  uid: string;
  type: PlaybookEntryType;
  title: string;
  content: string;
  tags?: string[];
  isExpertTemplate?: boolean;
}

export interface UpdatePlaybookEntryParams {
  title?: string;
  content?: string;
  tags?: string[];
  type?: PlaybookEntryType;
  isExpertTemplate?: boolean;
}

const playbookEncryptedFields: FieldSpec<Omit<PlaybookEntry, 'id'>>[] = [
  { field: 'title', encoding: 'string' },
  { field: 'content', encoding: 'string' },
  { field: 'tags', encoding: 'json' },
];

export async function createPlaybookEntry(params: CreatePlaybookEntryParams): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, 'playbookEntries'));
  const cryptoKey = getActiveCryptoKey();

  const nowIso = new Date().toISOString();
  const entry: Omit<PlaybookEntry, 'id'> = {
    uid: params.uid,
    type: params.type,
    title: params.title,
    content: params.content,
    tags: params.tags ?? [],
    isExpertTemplate: params.isExpertTemplate ?? false,
    usageCount: 0,
    createdAt: nowIso,
    updatedAt: nowIso,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  const encrypted = await encryptFields(entry, playbookEncryptedFields, cryptoKey);

  await setDoc(ref, {
    ...encrypted,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updatePlaybookEntry(
  entryId: string,
  updates: UpdatePlaybookEntryParams
): Promise<void> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const encrypted = await encryptFields(updates, playbookEncryptedFields as FieldSpec<typeof updates>[], cryptoKey);

  await updateDoc(doc(db, 'playbookEntries', entryId), {
    ...encrypted,
    updatedAt: serverTimestamp(),
  });
}

export async function getPlaybookEntries(uid: string, maxResults = 100): Promise<PlaybookEntry[]> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const q = query(
    collection(db, 'playbookEntries'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  const entries = await Promise.all(
    snapshot.docs.map(async (snap) => {
      const data = snap.data();
      const decrypted = await decryptFields<PlaybookEntry>(
        { id: snap.id, ...data } as PlaybookEntry,
        playbookEncryptedFields as FieldSpec<PlaybookEntry>[],
        cryptoKey
      );
      return {
        ...decrypted,
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      } as PlaybookEntry;
    })
  );

  return entries;
}

export async function deletePlaybookEntry(entryId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'playbookEntries', entryId));
}

function toISOString(value: Timestamp | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}
