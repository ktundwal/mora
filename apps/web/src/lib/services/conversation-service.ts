/**
 * Conversation Service
 *
 * Firestore CRUD operations for conversations and messages.
 * All operations are scoped to the authenticated user via Firestore rules.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import type {
  Conversation,
  Message,
  ParsedMessage,
  SpeakerMapping,
} from '@mora/core';
import { CURRENT_SCHEMA_VERSION, applyMapping, encryptFields, decryptFields } from '@mora/core';
import type { FieldSpec } from '@mora/core';
import { getActiveCryptoKey, hasActiveCryptoKey } from '../crypto/active-key';

// ============================================================================
// Types
// ============================================================================

export interface CreateConversationParams {
  uid: string;
  title: string;
  parsedMessages: ParsedMessage[];
  speakerMapping: SpeakerMapping;
  personId?: string | null;
}

const conversationEncryptedFields: FieldSpec<Omit<Conversation, 'id'>>[] = [
  { field: 'title', encoding: 'string' },
  { field: 'summary', encoding: 'string' },
];

const messageEncryptedFields: FieldSpec<Omit<Message, 'id'>>[] = [
  { field: 'text', encoding: 'string' },
  { field: 'originalRaw', encoding: 'string' },
];

// ============================================================================
// Create Operations
// ============================================================================

/**
 * Create a new conversation with messages.
 * Uses batched writes to ensure atomicity.
 *
 * @returns The new conversation ID
 */
export async function createConversation({
  uid,
  title,
  parsedMessages,
  speakerMapping,
  personId,
}: CreateConversationParams): Promise<string> {
  const db = getFirebaseDb();
  const hasCryptoKey = hasActiveCryptoKey();
  const cryptoKey = hasCryptoKey ? getActiveCryptoKey() : null;

  // Create conversation document FIRST (not in batch)
  // This is required because Firestore rules for sub-collections use get() 
  // to check parent ownership, which doesn't work within a batch
  const convRef = doc(collection(db, 'conversations'));

  const conversationData: Omit<Conversation, 'id'> = {
    uid,
    personId: personId ?? null,
    title,
    summary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: parsedMessages.length,
    status: 'active',
    hasUnpack: false,
    lastUnpackAt: null,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  // Write conversation first so security rules can verify ownership
  const dataToWrite = cryptoKey
    ? await encryptFields(conversationData, conversationEncryptedFields, cryptoKey)
    : conversationData;

  await setDoc(convRef, {
    ...dataToWrite,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Now batch write messages - rules can now verify parent ownership
  const messages = applyMapping(parsedMessages, speakerMapping, convRef.id);
  const messagesRef = collection(db, 'conversations', convRef.id, 'messages');

  // Firestore batches are limited to 500 operations
  const messagesToWrite = await Promise.all(
    messages.slice(0, 500).map((message) =>
      cryptoKey ? encryptFields(message, messageEncryptedFields, cryptoKey) : Promise.resolve(message)
    )
  );

  if (messagesToWrite.length > 0) {
    const batch = writeBatch(db);
    for (const message of messagesToWrite) {
      const msgRef = doc(messagesRef);
      batch.set(msgRef, message);
    }
    await batch.commit();
  }

  // If we have more than 500 messages, write them in subsequent batches
  if (messages.length > 500) {
    const remainingMessages = messages.slice(500);
    const encryptedRemaining = await Promise.all(
      remainingMessages.map((message) =>
        cryptoKey ? encryptFields(message, messageEncryptedFields, cryptoKey) : Promise.resolve(message)
      )
    );
    const chunks = chunkArray(encryptedRemaining, 500);

    for (const chunk of chunks) {
      const chunkBatch = writeBatch(db);
      for (const message of chunk) {
        const msgRef = doc(messagesRef);
        chunkBatch.set(msgRef, message);
      }
      await chunkBatch.commit();
    }
  }

  return convRef.id;
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all active conversations for a user, ordered by most recent first.
 */
export async function getConversations(
  uid: string,
  maxResults = 50
): Promise<Conversation[]> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const q = query(
    collection(db, 'conversations'),
    where('uid', '==', uid),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  const conversations = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const decrypted = await decryptFields<Conversation>(
        { id: docSnap.id, ...data } as Conversation,
        conversationEncryptedFields as FieldSpec<Conversation>[],
        cryptoKey
      );
      return {
        ...decrypted,
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      } as Conversation;
    })
  );

  return conversations;
}

/**
 * Get active conversations for a user linked to a specific person.
 *
 * Note: Firestore may require a composite index for (uid, status, personId, createdAt).
 */
export async function getConversationsForPerson(
  uid: string,
  personId: string,
  maxResults = 50
): Promise<Conversation[]> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const q = query(
    collection(db, 'conversations'),
    where('uid', '==', uid),
    where('status', '==', 'active'),
    where('personId', '==', personId),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  const conversations = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const decrypted = await decryptFields<Conversation>(
        { id: docSnap.id, ...data } as Conversation,
        conversationEncryptedFields as FieldSpec<Conversation>[],
        cryptoKey
      );
      return {
        ...decrypted,
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      } as Conversation;
    })
  );

  return conversations;
}

/**
 * Get a single conversation by ID.
 * Returns null if not found or if user doesn't own it.
 *
 * @param conversationId - The conversation ID
 * @param currentUid - Optional: current user's UID for ownership validation
 */
export async function getConversation(
  conversationId: string,
  currentUid?: string
): Promise<Conversation | null> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const docSnap = await getDoc(doc(db, 'conversations', conversationId));

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();

  // Client-side ownership validation (Firestore rules are the source of truth,
  // but this provides faster feedback and prevents unnecessary data exposure)
  if (currentUid && data.uid !== currentUid) {
    console.warn('Attempted to access conversation not owned by current user');
    return null;
  }

  const decrypted = await decryptFields<Conversation>(
    { id: docSnap.id, ...data } as Conversation,
    conversationEncryptedFields as FieldSpec<Conversation>[],
    cryptoKey
  );

  return {
    ...decrypted,
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
  } as Conversation;
}

/**
 * Get all messages for a conversation, ordered by message order.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  const messages = await Promise.all(
    snapshot.docs.map(async (docSnap) => {
      const data = docSnap.data();
      const decrypted = await decryptFields<Message>(
        { id: docSnap.id, ...data } as Message,
        messageEncryptedFields as FieldSpec<Message>[],
        cryptoKey
      );
      return decrypted as Message;
    })
  );

  return messages;
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Soft delete a conversation by setting status to 'deleted'.
 * Does not actually delete the document (for potential recovery).
 */
export async function deleteConversation(
  conversationId: string
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'conversations', conversationId), {
    status: 'deleted',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Archive a conversation.
 */
export async function archiveConversation(
  conversationId: string
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'conversations', conversationId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update conversation title.
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const db = getFirebaseDb();
  const cryptoKey = getActiveCryptoKey();
  const encrypted = await encryptFields(
    { title } as Record<string, unknown>,
    [{ field: 'title', encoding: 'string' }],
    cryptoKey
  );

  await updateDoc(doc(db, 'conversations', conversationId), {
    ...encrypted,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Link a conversation to a person.
 * Pass null to unlink.
 */
export async function updateConversationPerson(
  conversationId: string,
  personId: string | null
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, 'conversations', conversationId), {
    personId,
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert Firestore Timestamp to ISO string.
 */
function toISOString(value: Timestamp | string | undefined): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  // Handle Firestore Timestamp-like objects
  if (typeof value === 'object' && 'toDate' in value) {
    return (value as Timestamp).toDate().toISOString();
  }
  return new Date().toISOString();
}

/**
 * Split array into chunks of specified size.
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
