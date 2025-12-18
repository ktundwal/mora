// Shared types for Mora
// All Firestore documents should include schemaVersion for migrations

/** Current schema version - increment when making breaking changes */
export const CURRENT_SCHEMA_VERSION = 1;

// ============================================================================
// User & Subscription
// ============================================================================

export type SubscriptionTier = 'free' | 'pro';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isPro: boolean;
  subscriptionTier: SubscriptionTier;
  stripeCustomerId: string | null;
  unpacksUsedThisMonth: number;
  unpacksResetAt: string; // ISO string - when the monthly counter resets
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

// ============================================================================
// Conversations
// ============================================================================

export type Speaker = 'User' | 'Partner' | 'Unknown';

export type ConversationStatus = 'active' | 'archived' | 'deleted';

export interface Conversation {
  id: string;
  uid: string;
  title: string;
  summary: string | null; // AI-generated 1-liner
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  status: ConversationStatus;
  hasUnpack: boolean;
  lastUnpackAt: string | null;
  schemaVersion: number;
}

export interface Message {
  id: string;
  conversationId: string;
  speaker: Speaker;
  text: string;
  timestamp: string | null;
  originalRaw: string;
  order: number;
  schemaVersion: number;
}

// ============================================================================
// Artifacts (Reels, Transcripts, etc.)
// ============================================================================

export type ArtifactType = 'reel_transcript' | 'reel_video' | 'screenshot' | 'audio';

export interface Artifact {
  id: string;
  conversationId: string;
  uid: string;
  type: ArtifactType;
  title: string | null;
  transcript: string | null; // For reel transcripts
  sourceUrl: string | null; // Original reel URL
  storagePath: string | null; // Firebase Storage path for uploaded files
  mimeType: string | null;
  createdAt: string;
  schemaVersion: number;
}

// ============================================================================
// Unpacks (AI-generated analysis)
// ============================================================================

export interface UnpackSection {
  title: string;
  bullets: string[];
}

export interface Unpack {
  id: string;
  conversationId: string;
  uid: string;
  summary: string; // 1-2 paragraph summary
  keyPoints: string[]; // What she's communicating
  triggers: string[]; // Escalation moments
  harmfulActions: string[]; // "What I did that likely landed as harmful"
  agencyCheck: {
    offeredChoice: boolean;
    movedTooFast: boolean;
    notes: string | null;
  };
  dontSayList: string[]; // Anti-therapy-speak
  customSections: UnpackSection[]; // Extensible
  generatedAt: string;
  modelUsed: string; // e.g., "gpt-4o", "claude-3-sonnet"
  createdAt: string;
  schemaVersion: number;
}

// ============================================================================
// Reply Drafts
// ============================================================================

export type DraftTone = 'short' | 'medium' | 'ultra_brief' | 'custom';

export interface ReplyDraft {
  id: string;
  conversationId: string;
  uid: string;
  content: string;
  tone: DraftTone;
  isEdited: boolean;
  isSent: boolean; // Manual toggle
  sentAt: string | null;
  riskFlags: RiskFlag[];
  therapySpeakFlags: TherapySpeakFlag[];
  editHistory: DraftEdit[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface DraftEdit {
  previousContent: string;
  editedAt: string;
}

export interface RiskFlag {
  type: 'tone_policing' | 'reassurance_demand' | 'ledger_language' | 'defensive';
  excerpt: string; // The flagged text
  suggestion: string;
}

export interface TherapySpeakFlag {
  original: string; // e.g., "I hear you saying"
  suggestion: string; // e.g., "I get it"
}

// ============================================================================
// Playbook
// ============================================================================

export type PlaybookEntryType = 'in_the_moment' | 'do_list' | 'dont_list' | 'template';

export interface PlaybookEntry {
  id: string;
  uid: string;
  type: PlaybookEntryType;
  title: string;
  content: string; // Markdown supported
  tags: string[];
  isExpertTemplate: boolean; // Pro feature: curated templates
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportBundle {
  conversation: Conversation;
  messages: Message[];
  artifacts: Artifact[];
  unpacks: Unpack[];
  finalDraft: ReplyDraft | null;
  playbookSnippets: PlaybookEntry[];
  exportedAt: string;
}

// ============================================================================
// API Request/Response Types (for Cloud Functions)
// ============================================================================

export interface GenerateUnpackRequest {
  conversationId: string;
}

export interface GenerateUnpackResponse {
  unpack: Unpack;
}

export interface GenerateDraftsRequest {
  conversationId: string;
  unpackId: string;
}

export interface GenerateDraftsResponse {
  drafts: ReplyDraft[];
}

// ============================================================================
// Utility Types
// ============================================================================

/** Firestore document with common fields */
export interface FirestoreDoc {
  id: string;
  createdAt: string;
  updatedAt?: string;
  schemaVersion: number;
}

/** Helper to create a new document with defaults */
export type CreateDoc<T extends FirestoreDoc> = Omit<T, 'id' | 'createdAt' | 'schemaVersion'> & {
  id?: string;
};

// ============================================================================
// Free Tier Limits
// ============================================================================

export const FREE_TIER_LIMITS = {
  unpacksPerMonth: 3,
  historyDays: 7,
  playbookEntries: 5,
  draftTones: 1,
} as const;

export const PRO_TIER_LIMITS = {
  unpacksPerMonth: Infinity,
  historyDays: Infinity,
  playbookEntries: Infinity,
  draftTones: Infinity,
} as const;
