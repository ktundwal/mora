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
import { CURRENT_SCHEMA_VERSION } from '@mora/core';
import { getFirebaseDb } from '../firebase';

export interface CreatePersonParams {
  uid: string;
  displayName: string;
  relationshipType: RelationshipType;
  importanceNote?: string | null;
  profileNotes?: string | null;
}

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

  await setDoc(ref, {
    ...personData,
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
  await updateDoc(doc(db, 'people', personId), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function getPeople(uid: string, maxResults = 50): Promise<Person[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'people'),
    where('uid', '==', uid),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);

  const people = snapshot.docs.map((snap) => {
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      createdAt: toISOString(data.createdAt),
      updatedAt: toISOString(data.updatedAt),
    } as Person;
  });

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

  return {
    id: snap.id,
    ...data,
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
  } as Person;
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
