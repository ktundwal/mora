/**
 * Person Service
 *
 * Firestore CRUD operations for People (Person documents).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { Person, RelationshipType } from '@mora/core';
import { CURRENT_SCHEMA_VERSION, encryptFields, decryptFields } from '@mora/core';
import type { FieldSpec } from '@mora/core';
import { getActiveCryptoKey, hasActiveCryptoKey } from '../crypto/active-key';
import { getFirebaseDb } from '../firebase';

export interface CreatePersonParams {
  uid: string;
  displayName: string;
  relationshipType: RelationshipType;
  importanceNote?: string | null;
  profileNotes?: string | null;
}

const personEncryptedFields: FieldSpec<Omit<Person, 'id'>>[] = [
  { field: 'displayName', encoding: 'string' },
  { field: 'importanceNote', encoding: 'string' },
  { field: 'profileNotes', encoding: 'string' },
];

export async function createPerson(params: CreatePersonParams): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, 'people'));
  const nowIso = new Date().toISOString();
  const personData: Omit<Person, 'id'> = {
    uid: params.uid,
    displayName: params.displayName,
    relationshipType: params.relationshipType,
    importanceNote: params.importanceNote ?? null,
    profileNotes: params.profileNotes ?? null,
    createdAt: nowIso,
    updatedAt: nowIso,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  let finalData: any = personData;

  if (hasActiveCryptoKey()) {
    const cryptoKey = getActiveCryptoKey();
    finalData = await encryptFields(personData, personEncryptedFields, cryptoKey);
  }

  await setDoc(ref, {
    ...finalData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function updatePerson(
  personId: string,
  updates: Partial<Pick<Person, 'displayName' | 'relationshipType' | 'importanceNote' | 'profileNotes'>>
): Promise<void> {
  const db = getFirebaseDb();
  let updatesToSave: any = updates;

  if (hasActiveCryptoKey()) {
    const cryptoKey = getActiveCryptoKey();
    updatesToSave = await encryptFields(updates, personEncryptedFields as FieldSpec<typeof updates>[], cryptoKey);
  }

  await updateDoc(doc(db, 'people', personId), {
    ...updatesToSave,
    updatedAt: serverTimestamp(),
  });
}

export async function getPeople(uid: string, maxResults = 50): Promise<Person[]> {
  const db = getFirebaseDb();
  // Removed unconditional key access to prevent errors if key is missing (e.g. race condition)
  // const cryptoKey = getActiveCryptoKey(); 

  const q = query(
    collection(db, 'people'),
    where('uid', '==', uid),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);

  const people = await Promise.all(
    snapshot.docs.map(async (snap) => {
      const data = snap.data();
      let decrypted: any = { id: snap.id, ...data };
      const hasKey = hasActiveCryptoKey();

      console.log(`[getPeople] Processing ${snap.id}. HasKey: ${hasKey}`);

      if (hasKey) {
        try {
          const cryptoKey = getActiveCryptoKey();
          decrypted = await decryptFields<Person>(
            { id: snap.id, ...data } as Person,
            personEncryptedFields as FieldSpec<Person>[],
            cryptoKey
          );
        } catch (e) {
          console.error(`Failed to decrypt person ${snap.id}:`, e);
          // Return raw data if decryption fails
        }
      } else {
        console.warn(`[getPeople] Skipping decryption for ${snap.id} because no active key.`);
      }

      return sanitizePerson({
        ...decrypted,
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      } as Person);
    })
  );

  // Sort client-side to avoid composite index requirements for v1.
  people.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return people;
}

export async function getPerson(personId: string, currentUid?: string): Promise<Person | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, 'people', personId));
  if (!snap.exists()) return null;

  const data = snap.data();
  if (currentUid && data.uid !== currentUid) return null;

  let decrypted: any = { id: snap.id, ...data };

  if (hasActiveCryptoKey()) {
    try {
      const cryptoKey = getActiveCryptoKey();
      decrypted = await decryptFields<Person>(
        { id: snap.id, ...data } as Person,
        personEncryptedFields as FieldSpec<Person>[],
        cryptoKey
      );
    } catch (e) {
      console.error(`Failed to decrypt person ${personId}:`, e);
    }
  }

  return sanitizePerson({
    ...decrypted,
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
  } as Person);
}

// Helper to ensure we never return raw encrypted objects to the UI check
function sanitizePerson(p: any): Person {
  const sanitized = { ...p };
  // Check fields expected to be strings
  const stringFields = ['displayName', 'importanceNote', 'profileNotes'];

  for (const field of stringFields) {
    if (sanitized[field] && typeof sanitized[field] === 'object' && 'ct' in sanitized[field]) {
      // It's still an encrypted envelope
      sanitized[field] = 'Locked'; // or '[Encrypted]'
    }
  }
  return sanitized as Person;
}

/**
 * Delete a person.
 * Note: This does NOT cascade delete entries or unlink conversations.
 * Entries will become orphaned (should be cleaned up separately if needed).
 * Conversations with personId referencing this person will still have that reference.
 */
export async function deletePerson(personId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'people', personId));
}

function toISOString(value: Timestamp | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}
