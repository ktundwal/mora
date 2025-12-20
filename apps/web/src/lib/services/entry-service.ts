/**
 * Entry Service
 *
 * Firestore CRUD operations for Person Entries (sub-collection under people).
 */

import {
  collection,
  doc,
  getDocs,
  query,
  orderBy,
  limit,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { Entry, EntryType, EntryWhy } from '@mora/core';
import { CURRENT_SCHEMA_VERSION, encryptFields, decryptFields } from '@mora/core';
import type { FieldSpec } from '@mora/core';
import { getActiveCryptoKey } from '../crypto/active-key';
import { getFirebaseDb } from '../firebase';

export interface CreateEntryParams {
  uid: string;
  personId: string;
  type: EntryType;
  why: EntryWhy;
  whatTheySaid?: string | null;
  whatISaid?: string | null;
  content?: string | null;
}

const entryEncryptedFields: FieldSpec<Omit<Entry, 'id'>>[] = [
  { field: 'whatTheySaid', encoding: 'string' },
  { field: 'whatISaid', encoding: 'string' },
  { field: 'content', encoding: 'string' },
];

export async function createEntry(params: CreateEntryParams): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, 'people', params.personId, 'entries'));
  const cryptoKey = getActiveCryptoKey();

  const nowIso = new Date().toISOString();
  const entryData: Omit<Entry, 'id'> = {
    uid: params.uid,
    personId: params.personId,
    type: params.type,
    why: params.why,
    whatTheySaid: params.whatTheySaid ?? null,
    whatISaid: params.whatISaid ?? null,
    content: params.content ?? null,
    createdAt: nowIso,
    updatedAt: nowIso,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  const encrypted = await encryptFields(entryData, entryEncryptedFields, cryptoKey);

  await setDoc(ref, {
    ...encrypted,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getEntriesForPerson(
  personId: string,
  maxResults = 50
): Promise<Entry[]> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const q = query(
    collection(db, 'people', personId, 'entries'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  const entries = await Promise.all(
    snapshot.docs.map(async (snap) => {
      const data = snap.data();
      const decrypted = await decryptFields<Entry>(
        { id: snap.id, ...data } as Entry,
        entryEncryptedFields as FieldSpec<Entry>[],
        cryptoKey
      );
      return {
        ...decrypted,
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      } as Entry;
    })
  );

  return entries;
}

function toISOString(value: Timestamp | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}

/**
 * Delete an entry.
 */
export async function deleteEntry(personId: string, entryId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'people', personId, 'entries', entryId));
}
