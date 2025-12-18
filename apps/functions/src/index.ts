/**
 * Mora Cloud Functions (2nd Gen)
 * 
 * All AI calls (OpenAI/Anthropic) and Stripe interactions happen here.
 * Never expose API keys to the client.
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";

// Import shared types from @mora/core
import type { 
  Conversation, 
  GenerateUnpackRequest, 
  GenerateUnpackResponse 
} from "@mora/core";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

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
