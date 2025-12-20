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
  where,
} from 'firebase/firestore';
import type { Artifact, ArtifactType } from '@mora/core';
import { CURRENT_SCHEMA_VERSION, encryptFields, decryptFields } from '@mora/core';
import type { FieldSpec } from '@mora/core';
import { getActiveCryptoKey } from '../crypto/active-key';
import { getFirebaseDb } from '../firebase';

export interface CreateArtifactParams {
  uid: string;
  conversationId: string;
  type: ArtifactType;
  title?: string | null;
  transcript?: string | null;
  sourceUrl?: string | null;
  storagePath?: string | null;
  mimeType?: string | null;
}

const artifactEncryptedFields: FieldSpec<Omit<Artifact, 'id'>>[] = [
  { field: 'title', encoding: 'string' },
  { field: 'transcript', encoding: 'string' },
  { field: 'sourceUrl', encoding: 'string' },
  { field: 'storagePath', encoding: 'string' },
  { field: 'mimeType', encoding: 'string' },
];

export async function createArtifact(params: CreateArtifactParams): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, 'artifacts'));
  const cryptoKey = getActiveCryptoKey();

  const nowIso = new Date().toISOString();
  const artifact: Omit<Artifact, 'id'> = {
    conversationId: params.conversationId,
    uid: params.uid,
    type: params.type,
    title: params.title ?? null,
    transcript: params.transcript ?? null,
    sourceUrl: params.sourceUrl ?? null,
    storagePath: params.storagePath ?? null,
    mimeType: params.mimeType ?? null,
    createdAt: nowIso,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  const encrypted = await encryptFields(artifact, artifactEncryptedFields, cryptoKey);

  await setDoc(ref, {
    ...encrypted,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getArtifactsForConversation(
  conversationId: string,
  uid: string,
  maxResults = 50
): Promise<Artifact[]> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const q = query(
    collection(db, 'artifacts'),
    where('conversationId', '==', conversationId),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  const artifacts = await Promise.all(
    snapshot.docs.map(async (snap) => {
      const data = snap.data();
      const decrypted = await decryptFields<Artifact>(
        { id: snap.id, ...data } as Artifact,
        artifactEncryptedFields as FieldSpec<Artifact>[],
        cryptoKey
      );
      return {
        ...decrypted,
        createdAt: toISOString(data.createdAt),
      } as Artifact;
    })
  );

  return artifacts;
}

export async function deleteArtifact(artifactId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, 'artifacts', artifactId));
}

function toISOString(value: Timestamp | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}
