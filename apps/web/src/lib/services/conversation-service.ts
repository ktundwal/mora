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
import { CURRENT_SCHEMA_VERSION, applyMapping } from '@mora/core';

// ============================================================================
// Types
// ============================================================================

export interface CreateConversationParams {
  uid: string;
  title: string;
  parsedMessages: ParsedMessage[];
  speakerMapping: SpeakerMapping;
}

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
}: CreateConversationParams): Promise<string> {
  const db = getFirebaseDb();

  // Create conversation document FIRST (not in batch)
  // This is required because Firestore rules for sub-collections use get() 
  // to check parent ownership, which doesn't work within a batch
  const convRef = doc(collection(db, 'conversations'));

  const conversationData: Omit<Conversation, 'id'> = {
    uid,
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
  await setDoc(convRef, {
    ...conversationData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Now batch write messages - rules can now verify parent ownership
  const messages = applyMapping(parsedMessages, speakerMapping, convRef.id);
  const messagesRef = collection(db, 'conversations', convRef.id, 'messages');

  // Firestore batches are limited to 500 operations
  const messagesToWrite = messages.slice(0, 500);
  
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
    const chunks = chunkArray(remainingMessages, 500);

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
  const q = query(
    collection(db, 'conversations'),
    where('uid', '==', uid),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      // Convert Firestore Timestamps to ISO strings
      createdAt: toISOString(data.createdAt),
      updatedAt: toISOString(data.updatedAt),
    } as Conversation;
  });
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

  return {
    id: docSnap.id,
    ...data,
    createdAt: toISOString(data.createdAt),
    updatedAt: toISOString(data.updatedAt),
  } as Conversation;
}

/**
 * Get all messages for a conversation, ordered by message order.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('order', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Message[];
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
  await updateDoc(doc(db, 'conversations', conversationId), {
    title,
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
