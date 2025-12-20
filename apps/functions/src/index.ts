/**
 * Mora Cloud Functions (2nd Gen)
 * 
 * All AI calls (OpenAI/Anthropic) and Stripe interactions happen here.
 * Never expose API keys to the client.
 */
import { randomUUID } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { BulkWriter, DocumentData, Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";

// Import shared types from @mora/core
import type { 
  Conversation, 
  GenerateUnpackRequest, 
  GenerateUnpackResponse,
  AiProxyRequest,
  AiProxyResponse,
} from "@mora/core";
import { generateUserExport } from "./export";

// Provider secrets (proxy only; no content logging)
const openaiApiKey = defineSecret("OPENAI_API_KEY");
const adminProcessToken = defineSecret("ADMIN_PROCESS_TOKEN");

// Initialize Firebase Admin
initializeApp();
const auth = getAuth();
const db = getFirestore();
const storage = getStorage();

// =============================================================================
// Health Check
// =============================================================================

export const healthCheck = onRequest(
  { cors: true },
  async (_request, response) => {
    logger.info("Health check called");
    response.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      version: "0.1.0"
    });
  }
);

// =============================================================================
// AI Proxy (client -> provider)
// =============================================================================

async function callOpenAi(request: AiProxyRequest, apiKey: string): Promise<AiProxyResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    logger.error('OpenAI proxy failed', { status });
    throw new HttpsError('internal', 'AI provider error');
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: unknown;
    model?: string;
  };
  const content: string | undefined = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new HttpsError('internal', 'AI provider returned no content');
  }

  return {
    content,
    usage: json.usage,
    model: json.model,
  };
}

export const proxyChat = onCall<AiProxyRequest>({
  cors: true,
  enforceAppCheck: false,
  secrets: [openaiApiKey],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required');
  }

  const { model, messages, temperature } = request.data || {};
  if (!model || !Array.isArray(messages) || messages.length === 0) {
    throw new HttpsError('invalid-argument', 'model and messages are required');
  }

  // Provider selection: currently OpenAI only; extendable later
  const apiKey = openaiApiKey.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'AI provider key not configured');
  }

  const result = await callOpenAi({ model, messages, temperature }, apiKey);
  // Do not log prompts or responses (privacy)
  logger.info('proxyChat success', { uid: request.auth.uid, model: result.model });
  return result;
});

// =============================================================================
// Unpack Generation (Callable Function)
// =============================================================================

export const generateUnpack = onCall<GenerateUnpackRequest>(
  { 
    cors: true,
    enforceAppCheck: false, // Enable in production
  },
  async (request): Promise<GenerateUnpackResponse> => {
    // Ensure user is authenticated
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be signed in.");
    }

    const { conversationId } = request.data;
    const uid = request.auth.uid;

    if (!conversationId) {
      throw new HttpsError("invalid-argument", "conversationId is required.");
    }

    // Verify user owns this conversation
    const conversationRef = db.collection("conversations").doc(conversationId);
    const conversationSnap = await conversationRef.get();
    
    if (!conversationSnap.exists) {
      throw new HttpsError("not-found", "Conversation not found.");
    }

    const conversation = conversationSnap.data() as Conversation;
    if (conversation.uid !== uid) {
      throw new HttpsError("permission-denied", "Not authorized.");
    }

    // TODO: Check if user has remaining unpacks (free tier limit)
    // TODO: Call AI provider to generate unpack
    // TODO: Store unpack in Firestore

    logger.info("Generating unpack", { conversationId, uid });

    throw new HttpsError("unimplemented", "Unpack generation not yet implemented.");
  }
);

// =============================================================================
// Firestore Triggers
// =============================================================================

export const onConversationCreated = onDocumentCreated(
  "conversations/{conversationId}",
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("No data in conversation created event");
      return;
    }

    const conversation = snapshot.data() as Conversation;
    logger.info("New conversation created", { 
      id: snapshot.id, 
      uid: conversation.uid,
      title: conversation.title 
    });

    // TODO: Trigger auto-summary generation
    // TODO: Update user stats
  }
);

// =============================================================================
// Stripe Webhooks (HTTP endpoint for Stripe to call)
// =============================================================================

export const stripeWebhook = onRequest(
  { cors: false }, // Stripe sends POST, no CORS needed
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    // TODO: Verify Stripe signature
    // TODO: Handle checkout.session.completed
    // TODO: Handle customer.subscription.updated
    // TODO: Handle customer.subscription.deleted

    logger.info("Stripe webhook received");
    response.json({ received: true });
  }
);

// =============================================================================
// Settings: Export / Delete Data / Delete Account (Stubbed)
// =============================================================================

interface ActionResponse {
  status: 'queued';
  action: 'export' | 'deleteData' | 'deleteAccount';
  message: string;
}

type AdminAction = ActionResponse['action'];
type AdminStatus = 'queued' | 'processed' | 'failed';

interface AdminRequestRecord {
  uid: string;
  action: AdminAction;
  status: AdminStatus;
  createdAt: string;
  reason?: string | null;
  processedAt?: string;
  error?: string;
  attempts?: number;
}

function assertAuth(auth: { uid?: string } | undefined): asserts auth is { uid: string } {
  if (!auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign-in required');
  }
}

export const requestExport = onCall<{ reason?: string }>(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    assertAuth(request.auth);
    const now = new Date().toISOString();
    const payload = {
      uid: request.auth.uid,
      action: 'export' as const,
      reason: request.data?.reason ?? null,
      status: 'queued' as AdminStatus,
      createdAt: now,
    };
    await db.collection('adminRequests').add(payload);
    logger.info('Export requested', { uid: request.auth.uid });
    return {
      status: 'queued',
      action: 'export',
      message: 'Export request queued.',
    } satisfies ActionResponse;
  }
);

export const requestDataDelete = onCall<{ reason?: string }>(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    assertAuth(request.auth);
    const now = new Date().toISOString();
    const payload = {
      uid: request.auth.uid,
      action: 'deleteData' as const,
      reason: request.data?.reason ?? null,
      status: 'queued' as AdminStatus,
      createdAt: now,
    };
    await db.collection('adminRequests').add(payload);
    logger.info('Data delete requested', { uid: request.auth.uid });
    return {
      status: 'queued',
      action: 'deleteData',
      message: 'Data delete request queued.',
    } satisfies ActionResponse;
  }
);

export const requestAccountDelete = onCall<{ reason?: string }>(
  { cors: true, enforceAppCheck: false },
  async (request) => {
    assertAuth(request.auth);
    const now = new Date().toISOString();
    const payload = {
      uid: request.auth.uid,
      action: 'deleteAccount' as const,
      reason: request.data?.reason ?? null,
      status: 'queued' as AdminStatus,
      createdAt: now,
    };
    await db.collection('adminRequests').add(payload);
    logger.info('Account delete requested', { uid: request.auth.uid });
    return {
      status: 'queued',
      action: 'deleteAccount',
      message: 'Account delete request queued.',
    } satisfies ActionResponse;
  }
);

// =============================================================================
// Admin Requests Processor (stub) - consumes queued adminRequests
// =============================================================================

export const processAdminRequests = onRequest(
  { cors: false, secrets: [adminProcessToken] },
  async (request, response) => {
    const tokenHeader = request.headers['x-admin-token'];
    const token = Array.isArray(tokenHeader) ? tokenHeader[0] : tokenHeader;
    const expected = adminProcessToken.value();
    if (!expected || token !== expected) {
      logger.warn('processAdminRequests unauthorized');
      response.status(401).json({ error: 'unauthorized' });
      return;
    }

    const requestId = randomUUID();

    const snapshot = await db
      .collection('adminRequests')
      .where('status', '==', 'queued')
      .orderBy('createdAt', 'asc')
      .limit(25)
      .get();

    if (snapshot.empty) {
      response.json({ processed: 0 });
      return;
    }

    logger.info('processAdminRequests start', { requestId, queued: snapshot.size });
    let processed = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data() as AdminRequestRecord;
      const attempts = typeof data.attempts === 'number' ? data.attempts : 0;

      try {
        await processAdminRequest(doc.id, data, requestId);
        processed += 1;
      } catch (err) {
        const nextAttempts = attempts + 1;
        const failureStatus: AdminStatus = nextAttempts >= 3 ? 'failed' : 'queued';
        const message = (err as Error)?.message ?? 'unknown error';
        logger.error('Failed processing admin request', {
          requestId,
          id: doc.id,
          uid: data.uid,
          action: data.action,
          error: message,
          attempts: nextAttempts,
          status: failureStatus,
        });
        await doc.ref.update({
          status: failureStatus,
          attempts: nextAttempts,
          error: message,
          processedAt: new Date().toISOString(),
        });
      }
    }

    response.json({ processed, requestId });
  }
);

async function processAdminRequest(id: string, data: AdminRequestRecord, requestId: string): Promise<void> {
  const docRef = db.collection('adminRequests').doc(id);

  switch (data.action) {
    case 'deleteData': {
      await deleteUserData(data.uid);
      await docRef.update({ status: 'processed', processedAt: new Date().toISOString() });
      logger.info('Deleted user data', { requestId, id, uid: data.uid });
      return;
    }
    case 'deleteAccount': {
      await deleteUserData(data.uid);
      try {
        await auth.deleteUser(data.uid);
      } catch (err) {
        logger.warn('Failed to delete auth user (may not exist)', { requestId, uid: data.uid, error: (err as Error)?.message });
      }
      await docRef.update({ status: 'processed', processedAt: new Date().toISOString() });
      logger.info('Deleted user account', { requestId, id, uid: data.uid });
      return;
    }
    case 'export': {
      const result = await generateUserExport({ uid: data.uid, db, storage });
      await docRef.update({
        status: 'processed',
        processedAt: new Date().toISOString(),
        exportPath: result.storagePath,
        exportUrl: result.signedUrl,
        exportFormat: result.format,
        requestId: result.requestId,
      });
      logger.info('Export generated', { requestId, id, uid: data.uid, path: result.storagePath });
      return;
    }
    default:
      throw new Error(`Unsupported action ${data.action}`);
  }
}

async function deleteUserData(uid: string): Promise<void> {
  const bulkWriter = db.bulkWriter();

  // Delete conversations and messages
  const conversationsSnap = await db.collection('conversations').where('uid', '==', uid).get();
  const conversationIds: string[] = [];
  conversationsSnap.forEach((doc) => {
    conversationIds.push(doc.id);
    bulkWriter.delete(doc.ref);
  });

  for (const conversationId of conversationIds) {
    const messagesSnap = await db.collection('conversations').doc(conversationId).collection('messages').get();
    messagesSnap.forEach((msg) => bulkWriter.delete(msg.ref));
  }

  // Delete artifacts, unpacks, drafts, playbook entries
  await deleteByQuery(db.collection('artifacts').where('uid', '==', uid), bulkWriter);
  await deleteByQuery(db.collection('unpacks').where('uid', '==', uid), bulkWriter);
  await deleteByQuery(db.collection('replyDrafts').where('uid', '==', uid), bulkWriter);
  await deleteByQuery(db.collection('playbookEntries').where('uid', '==', uid), bulkWriter);

  // Delete people and entries
  const peopleSnap = await db.collection('people').where('uid', '==', uid).get();
  const personIds: string[] = [];
  peopleSnap.forEach((doc) => {
    personIds.push(doc.id);
    bulkWriter.delete(doc.ref);
  });

  for (const personId of personIds) {
    const entriesSnap = await db.collection('people').doc(personId).collection('entries').get();
    entriesSnap.forEach((entry) => bulkWriter.delete(entry.ref));
  }

  // Delete user profile
  await deleteByQuery(db.collection('users').where('uid', '==', uid), bulkWriter);

  await bulkWriter.close();
}

async function deleteByQuery(q: Query<DocumentData>, bulkWriter: BulkWriter): Promise<void> {
  const snapshot = await q.get();
  snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
    bulkWriter.delete(doc.ref);
  });
}
