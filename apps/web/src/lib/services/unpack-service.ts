import {
  collection,
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
import type { AiProxyRequest, Unpack, ReplyDraft } from '@mora/core';
import { CURRENT_SCHEMA_VERSION, encryptFields, decryptFields } from '@mora/core';
import type { FieldSpec } from '@mora/core';
import { getActiveCryptoKey } from '../crypto/active-key';
import { proxyChat } from './ai-service';
import { getFirebaseDb } from '../firebase';

const unpackEncryptedFields: FieldSpec<Omit<Unpack, 'id'>>[] = [
  { field: 'summary', encoding: 'string' },
  { field: 'keyPoints', encoding: 'json' },
  { field: 'triggers', encoding: 'json' },
  { field: 'harmfulActions', encoding: 'json' },
  { field: 'agencyCheck', encoding: 'json' },
  { field: 'dontSayList', encoding: 'json' },
  { field: 'customSections', encoding: 'json' },
];

const replyDraftEncryptedFields: FieldSpec<Omit<ReplyDraft, 'id'>>[] = [
  { field: 'content', encoding: 'string' },
  { field: 'riskFlags', encoding: 'json' },
  { field: 'therapySpeakFlags', encoding: 'json' },
  { field: 'editHistory', encoding: 'json' },
];

type UpdateReplyDraftParams = Partial<
  Pick<ReplyDraft, 'content' | 'isEdited' | 'isSent' | 'sentAt' | 'riskFlags' | 'therapySpeakFlags' | 'tone'>
>;

interface ProxyParams {
  model?: string;
  temperature?: number;
}

interface CreateUnpackParams extends ProxyParams {
  uid: string;
  conversationId: string;
  prompt: string;
}

interface CreateReplyDraftParams extends ProxyParams {
  uid: string;
  conversationId: string;
  unpackId?: string | null;
  prompt: string;
}

function buildMessages(prompt: string): AiProxyRequest['messages'] {
  return [
    {
      role: 'user',
      content: prompt,
    },
  ];
}

export async function createUnpackFromProxy(params: CreateUnpackParams): Promise<string> {
  const { uid, conversationId, prompt, model = 'gpt-4o-mini', temperature = 0.4 } = params;
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();

  const response = await proxyChat({
    model,
    temperature,
    messages: buildMessages(prompt),
  });

  const nowIso = new Date().toISOString();
  const unpack: Omit<Unpack, 'id'> = {
    conversationId,
    uid,
    summary: response.content,
    keyPoints: [],
    triggers: [],
    harmfulActions: [],
    agencyCheck: { offeredChoice: false, movedTooFast: false, notes: null },
    dontSayList: [],
    customSections: [],
    generatedAt: nowIso,
    modelUsed: response.model ?? model,
    createdAt: nowIso,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  const encrypted = await encryptFields(unpack, unpackEncryptedFields, cryptoKey);
  const ref = doc(collection(doc(db, 'conversations', conversationId), 'unpacks'));
  await setDoc(ref, {
    ...encrypted,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function createReplyDraftFromProxy(params: CreateReplyDraftParams): Promise<string> {
  const { uid, conversationId, unpackId = null, prompt, model = 'gpt-4o-mini', temperature = 0.5 } = params;
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();

  const response = await proxyChat({
    model,
    temperature,
    messages: buildMessages(prompt),
  });

  const nowIso = new Date().toISOString();
  const draft: Omit<ReplyDraft, 'id'> = {
    conversationId,
    uid,
    tone: 'custom',
    content: response.content,
    isEdited: false,
    isSent: false,
    sentAt: null,
    riskFlags: [],
    therapySpeakFlags: [],
    editHistory: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  const encrypted = await encryptFields(draft, replyDraftEncryptedFields, cryptoKey);
  const ref = doc(collection(doc(db, 'conversations', conversationId), 'replyDrafts'));
  await setDoc(ref, {
    ...encrypted,
    unpackId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getUnpacksForConversation(
  conversationId: string,
  uid: string,
  maxResults = 10
): Promise<Unpack[]> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const q = query(
    collection(doc(db, 'conversations', conversationId), 'unpacks'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  const unpacks = await Promise.all(
    snapshot.docs.map(async (snap) => {
      const data = snap.data();
      const decrypted = await decryptFields<Unpack>(
        { id: snap.id, ...data } as Unpack,
        unpackEncryptedFields as FieldSpec<Unpack>[],
        cryptoKey
      );
      return {
        ...decrypted,
        createdAt: toISOString(data.createdAt),
        generatedAt: toISOString(data.generatedAt),
      } as Unpack;
    })
  );

  return unpacks;
}

export async function getReplyDraftsForConversation(
  conversationId: string,
  uid: string,
  maxResults = 10
): Promise<ReplyDraft[]> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const q = query(
    collection(doc(db, 'conversations', conversationId), 'replyDrafts'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  const drafts = await Promise.all(
    snapshot.docs.map(async (snap) => {
      const data = snap.data();
      const decrypted = await decryptFields<ReplyDraft>(
        { id: snap.id, ...data } as ReplyDraft,
        replyDraftEncryptedFields as FieldSpec<ReplyDraft>[],
        cryptoKey
      );
      return {
        ...decrypted,
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      } as ReplyDraft;
    })
  );

  return drafts;
}

export async function updateReplyDraft(
  conversationId: string,
  draftId: string,
  updates: UpdateReplyDraftParams
): Promise<void> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const encrypted = await encryptFields(updates, replyDraftEncryptedFields as FieldSpec<typeof updates>[], cryptoKey);

  await updateDoc(doc(db, 'conversations', conversationId, 'replyDrafts', draftId), {
    ...encrypted,
    updatedAt: serverTimestamp(),
  });
}

function toISOString(value: Timestamp | string | undefined): string {
  if (!value) return new Date().toISOString();
  if (typeof value === 'string') return value;
  return value.toDate().toISOString();
}
