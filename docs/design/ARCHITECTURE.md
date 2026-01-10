# Mora Technical Architecture

**Last Updated:** January 2026
**Status:** Active

---

## System Overview

Mora is a mobile-first web application with AI-powered memory and analysis capabilities, built on Firebase with MIRA-OSS as the memory engine.

```
┌─────────────────────────────────────────────────────────┐
│              Mora Frontend (Next.js/Vercel)             │
│  • React 19, Next.js 16 (App Router)                    │
│  • Tailwind CSS 4, Radix UI                             │
│  • E2E encryption (Web Crypto API)                      │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│        Firebase Cloud Functions (2nd Gen, Node.js)      │
│  • Authentication validation                            │
│  • Rate limiting & quota enforcement                    │
│  • Stripe billing webhooks                              │
│  • Bridge to MIRA-OSS service                           │
└──────────────┬────────────────────┬─────────────────────┘
               │                    │
               ▼                    ▼
   ┌───────────────────┐  ┌────────────────────────────┐
   │    Firestore      │  │  MIRA-OSS Service          │
   │    • UI metadata  │  │  • FastAPI (Python)        │
   │    • User profiles│  │  • PostgreSQL + pgvector   │
   │    • Encrypted    │  │  • Valkey (Redis fork)     │
   │      data         │  │  • Memory extraction       │
   └───────────────────┘  │  • Entity linking          │
                          │  • Activity-based decay     │
                          └────────────────────────────┘
```

---

## Frontend Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 16 (App Router) | React meta-framework, SSR, routing |
| **UI** | React 19 | Component library |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Components** | Radix UI | Accessible primitives |
| **State** | Zustand 5 | Client state management |
| **Auth** | Firebase Auth | Authentication |
| **Database** | Firestore | NoSQL document store |
| **Encryption** | Web Crypto API | Client-side E2EE |
| **Testing** | Vitest + Playwright | Unit + E2E tests |

### Directory Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (app)/             # Authenticated routes
│   │   │   ├── layout.tsx     # AuthGuard + CryptoGuard + OnboardingGuard
│   │   │   ├── journal/       # Main journal view (NEW)
│   │   │   ├── threads/       # Topic-based threads (NEW)
│   │   │   ├── patterns/      # Pattern dashboard (NEW)
│   │   │   ├── people/        # People layer (existing)
│   │   │   └── settings/      # User settings
│   │   ├── onboarding/        # First-run experience
│   │   ├── setup/             # Encryption setup
│   │   ├── unlock/            # Device passphrase
│   │   ├── recover/           # Recovery phrase
│   │   └── login/             # Authentication
│   ├── components/
│   │   ├── journal/           # Journal entry components (NEW)
│   │   ├── unpack/            # Unpack analysis display (NEW)
│   │   ├── draft/             # Reply draft editor (NEW)
│   │   ├── patterns/          # Pattern visualizations (NEW)
│   │   ├── auth/              # Auth guards, FirebaseUI
│   │   └── ui/                # Reusable UI primitives
│   └── lib/
│       ├── services/          # API clients (Firestore CRUD, AI proxy)
│       ├── stores/            # Zustand stores
│       ├── crypto/            # Encryption utilities
│       └── firebase.ts        # Firebase SDK initialization
└── tests/
    └── e2e/                   # Playwright tests
```

### State Management

**Zustand Stores:**
```typescript
// User store (profile, subscription)
useUserStore → { profile, isPro, canUseUnpack() }

// Journal store (NEW)
useJournalStore → { entries[], createEntry(), fetchEntries() }

// Thread store (NEW - replaces Person store)
useThreadStore → { threads[], topics[], fetchThreads() }

// Pattern store (NEW)
usePatternStore → { patterns[], triggers[], fetchPatterns() }

// Conversation store (existing - conversations within threads)
useConversationStore → { conversations[], createConversation() }

// Client preferences (localStorage)
useClientPreferences → { hasAuthenticatedBefore, onboardingState }

// Guest store (pre-auth, localStorage)
useGuestStore → { entries[], analysis, addEntry() }
```

**React Context:**
```typescript
// Auth context
<AuthProvider>
  useAuth() → { user, loading, signInWithGoogle(), signOut() }

// Crypto context
<CryptoProvider>
  useCrypto() → { status, masterKey, generateAndStoreKey() }
```

### Route Protection

Three-layer guard hierarchy:

1. **AuthGuard** — Ensures user is authenticated
2. **CryptoGuard** — Ensures encryption key is initialized
3. **OnboardingGuard** — Ensures onboarding is completed

All protected routes in `/(app)` are wrapped with this chain.

---

## Backend Architecture

### Firebase Cloud Functions

**Entry Point:** `apps/functions/src/index.ts`

**Core Functions:**

```typescript
// AI Analysis (NEW - replaces proxyChat for journal use case)
export const analyzeEntry = onCall<AnalyzeEntryRequest>({
  secrets: [openaiApiKey, miraServiceKey],
}, async (request) => {
  // 1. Validate auth + quota
  // 2. Decrypt content (if encrypted)
  // 3. Call MIRA-OSS /chat endpoint
  // 4. Extract topics/entities from response
  // 5. Sync metadata to Firestore
  // 6. Return analysis + memories
});

// Unpack Generation (existing, enhanced with MIRA context)
export const generateUnpack = onCall<GenerateUnpackRequest>({
  secrets: [openaiApiKey, miraServiceKey],
}, async (request) => {
  // 1. Fetch conversation + recent context from MIRA
  // 2. Build Unpack prompt with memory context
  // 3. Call Anthropic Claude Opus 4.5
  // 4. Store Unpack in Firestore (encrypted)
});

// Reply Draft Generation (existing)
export const generateDraft = onCall<GenerateDraftRequest>({
  secrets: [openaiApiKey],
}, async (request) => {
  // 1. Load Unpack + conversation
  // 2. Generate draft with specified tone
  // 3. Flag therapy-speak, defensiveness
});

// Stripe Webhooks (stubbed)
export const stripeWebhook = onRequest(async (req, res) => {
  // TODO: Implement subscription lifecycle
});

// Health Check
export const healthCheck = onRequest(async (req, res) => {
  res.json({ status: 'healthy' });
});
```

### MIRA-OSS Integration

**Deployment:** Cloud Run (or Fly.io)

**Bridge Pattern:**
```typescript
// apps/functions/src/mira-bridge.ts

async function callMira(userId: string, message: string, metadata: any) {
  const miraUserId = await ensureMiraUserMapping(userId);

  const response = await fetch(`${MIRA_URL}/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${miraServiceKey.value()}`,
      'X-Mora-User-Id': miraUserId,
    },
    body: JSON.stringify({
      message,
      metadata: { source: 'mora', ...metadata }
    })
  });

  const data = await response.json();

  // Extract topics from MIRA's entity detection
  const topics = extractTopicsFromEntities(data.entities);

  // Extract surfaced memories
  const memories = data.surfaced_memories || [];

  return { analysis: data.content, topics, memories };
}

async function ensureMiraUserMapping(firebaseUid: string): Promise<string> {
  // Check Firestore for existing mapping
  const mappingRef = db.collection('mira_users').doc(firebaseUid);
  const mapping = await mappingRef.get();

  if (mapping.exists) {
    return mapping.data()!.miraUserId;
  }

  // Create new MIRA user via API
  const response = await fetch(`${MIRA_URL}/users`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${miraServiceKey.value()}` },
    body: JSON.stringify({ firebaseUid })
  });

  const { userId: miraUserId } = await response.json();

  // Store mapping
  await mappingRef.set({ miraUserId, createdAt: FieldValue.serverTimestamp() });

  return miraUserId;
}
```

---

## Data Architecture

### Firestore Collections

**UI Metadata (Fast Listing, Client-Side Encryption)**

```typescript
// Journal entries (NEW)
interface JournalEntry {
  id: string;
  uid: string;
  preview: string;           // First 100 chars (plaintext for search)
  content: EncryptedEnvelope; // Full content (encrypted)
  topics: string[];          // Auto-extracted: ["work", "manager", "anxiety"]
  entryType: 'journal' | 'conversation' | 'decision';
  mood?: string;             // Optional mood tracking
  miraMessageId: string;     // Link to MIRA PostgreSQL message
  miraConversationId: string; // MIRA continuum/segment reference
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
}

// Threads (NEW - replaces Person as primary organizational unit)
interface Thread {
  id: string;
  uid: string;
  title: string;             // Auto-generated from entries
  topics: string[];          // ["work", "Sarah", "boundaries"]
  entityType: 'person' | 'theme' | 'decision' | 'situation';
  entryCount: number;
  lastEntryAt: Timestamp;
  miraEntityIds: string[];   // Links to MIRA entities
  createdAt: Timestamp;
  schemaVersion: number;
}

// Patterns (NEW - user-specific patterns detected by MIRA)
interface Pattern {
  id: string;
  uid: string;
  type: 'defensive' | 'trigger' | 'coping' | 'growth';
  name: string;              // "Over-explaining when anxious"
  description: string;       // Longer explanation
  firstDetected: Timestamp;
  lastOccurrence: Timestamp;
  occurrenceCount: number;
  relatedEntries: string[];  // Entry IDs where pattern appeared
  miraMemoryIds: string[];   // Links to MIRA memories
  schemaVersion: number;
}

// Users (existing)
interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  isPro: boolean;
  subscriptionTier: 'free' | 'plus' | 'pro';
  unpacksUsedThisMonth: number;
  unpacksResetAt: string;
  encryptionEnabled: boolean;
  onboardingCompleted: boolean;
  miraUserId: string | null;  // NEW: Link to MIRA user
  createdAt: Timestamp;
  schemaVersion: number;
}

// People (existing - still exists for backward compat, secondary to Threads)
interface Person {
  id: string;
  uid: string;
  displayName: EncryptedEnvelope;
  relationshipType: RelationshipType;
  importanceNote: EncryptedEnvelope | null;
  threadId: string | null;    // NEW: Link to Thread
  // ... existing fields
}

// Conversations (existing - nested under Threads now)
interface Conversation {
  id: string;
  uid: string;
  threadId: string;           // NEW: Link to Thread (replaces personId)
  title: EncryptedEnvelope;
  messageCount: number;
  status: 'active' | 'archived' | 'deleted';
  hasUnpack: boolean;
  // ... existing fields
}

// Messages (existing - sub-collection under Conversations)
interface Message {
  id: string;
  conversationId: string;
  speaker: 'User' | 'Partner' | 'Unknown';
  text: EncryptedEnvelope;
  timestamp: string | null;
  order: number;
}

// Unpacks (existing - sub-collection under Conversations)
interface Unpack {
  id: string;
  conversationId: string;
  uid: string;
  summary: EncryptedEnvelope;
  keyPoints: EncryptedEnvelope[];
  triggers: EncryptedEnvelope[];
  harmfulActions: EncryptedEnvelope[];
  // ... existing fields
}

// MIRA User Mapping (NEW - internal)
interface MiraUserMapping {
  firebaseUid: string;        // Document ID
  miraUserId: string;         // MIRA's internal user ID
  createdAt: Timestamp;
}
```

### MIRA-OSS PostgreSQL Schema

MIRA manages full conversation history and memory graph in PostgreSQL. Firestore only stores UI metadata for fast listing.

**Key MIRA Tables:**
- `users` — MIRA user accounts (linked to Firebase UID)
- `continuums` — One per user, conversation metadata
- `messages` — All conversation messages with embeddings
- `memories` — Long-term memory with decay scoring
- `entities` — Knowledge graph nodes (people, topics, concepts)
- `memory_links` — Typed relationships between memories

**Data Flow:**
```
User writes entry → Firebase Function
  ↓
Decrypt (if encrypted) → Plain text
  ↓
Call MIRA /chat → Process with full memory context
  ↓
MIRA extracts memories, links entities, updates graph
  ↓
Function receives: AI response, topics, surfaced memories
  ↓
Sync metadata to Firestore (encrypted)
  ↓
Return to client for display
```

---

## Security Architecture

### End-to-End Encryption

**Client-Side (Web Crypto API)**

```typescript
// Key generation
const masterKey = await generateMasterKey(); // 256-bit AES
const phrase = await masterKeyToRecoveryPhrase(masterKey); // 24 words (BIP39)
const hash = await hashSha256(phrase.join(' ')); // Store hash in Firestore

// Field encryption
interface EncryptedEnvelope {
  ct: string;   // Base64 ciphertext (AES-256-GCM)
  iv: string;   // Base64 IV (12 bytes, unique per operation)
  v: number;    // Version (for future migrations)
}

// Encrypt before write
const encrypted = await encryptString(plaintext, masterKey);
// { ct: "...", iv: "...", v: 1 }

// Decrypt after read
const plaintext = await decryptString(encrypted, masterKey);
```

**What's Encrypted:**
- All user-generated content (journal entries, notes, messages)
- All AI-generated content (unpacks, drafts, insights)
- Personal metadata (person names, importance notes)

**What's NOT Encrypted:**
- User ID (for security rules)
- Topics/tags (for client-side filtering)
- Timestamps (for sorting)
- Entry types (for queries)
- Metadata needed for UI rendering

**Key Storage:**
- **IndexedDB** (per device): Master key stored locally
- **Optional passphrase**: Encrypt master key with device passphrase (PBKDF2)
- **Recovery phrase**: 24-word BIP39 phrase for multi-device access

**MIRA Integration:**
- Function decrypts before sending to MIRA (secure context, keys never logged)
- MIRA processes plaintext, returns plaintext
- Function re-encrypts before saving to Firestore
- MIRA cannot decrypt Firestore data (keys never leave client/function)

### Authentication & Authorization

**Firebase Auth:**
- Google OAuth (primary)
- Email/password (supported)
- Session management via Firebase SDK

**Firestore Security Rules:**
```javascript
match /journal_entries/{entryId} {
  allow create: if request.auth.uid == request.resource.data.uid;
  allow read, update, delete: if request.auth.uid == resource.data.uid;
}

match /threads/{threadId} {
  allow create: if request.auth.uid == request.resource.data.uid;
  allow read, update, delete: if request.auth.uid == resource.data.uid;
}

// Similar user-scoped rules for all collections
```

**Rate Limiting:**
- Firebase Function enforces quota before processing
- Free tier: 10 entries/month, 3 unpacks/month
- Plus tier: Unlimited entries, 30 unpacks/month
- Pro tier: Unlimited

---

## AI/ML Architecture

### Model Selection Strategy

**Primary Model: Anthropic Claude Opus 4.5**
- Use case: Unpack generation, complex reasoning
- Cost: $15/1M input tokens, $75/1M output tokens
- Avg cost per Unpack: ~$0.30 (10k input + 2k output)

**Secondary Model: Google Gemini 1.5 Flash**
- Use case: Guest mode analysis (free tier)
- Cost optimization: Cheaper than OpenAI for high volume
- Cost: ~$0.05 per analysis

**Fallback Model: OpenAI GPT-4o**
- Use case: If Anthropic has outage
- Cost: Similar to Claude

**MIRA's Models (Backend):**
- Reasoning: Anthropic Claude (configurable tier)
- Execution: Groq models (fast, cheap for simple tools)
- Embeddings: Sentence Transformers (local, no API cost)
- Fallback: Ollama local models (privacy mode)

### Prompt Strategy

**Unpack Prompt Structure:**
```
System: You are an expert at understanding high-stakes conversations...

Context from MIRA:
- Related memories: [User's past patterns]
- Current situation: [What happened]
- User's self-model: [From Domaindocs]

Generate:
1. Core Tension (what's really at stake)
2. What They're Saying (pain/need, not attack)
3. Your Blind Spots (defensive patterns)
4. Draft Approach (what to say next)

Guardrails:
- No therapy-speak
- No blame/judgment
- Short, human language
```

**Draft Generation Prompt:**
```
Given:
- Unpack analysis
- Conversation history
- User's past communication style (from MIRA)
- Tone preference: [short | medium | ultra-brief | custom]

Generate:
- Reply draft in user's voice
- Flag therapy-speak
- Flag defensiveness
- Suggest "Drop the Shield" if over-explaining
```

---

## Infrastructure & Deployment

### Hosting

| Component | Platform | Scaling |
|-----------|----------|---------|
| **Frontend** | Vercel | Auto-scale, edge CDN |
| **Functions** | Firebase Cloud Functions Gen 2 | Auto-scale, 0 → N instances |
| **MIRA Service** | Cloud Run (or Fly.io) | Auto-scale, min 1 instance |
| **PostgreSQL** | Cloud SQL (or Neon) | Managed, vertical scaling |
| **Valkey** | Upstash (or Redis Cloud) | Managed, auto-scale |
| **Firestore** | Firebase | Serverless, auto-scale |

### Cost Estimate (Monthly)

**Fixed Infrastructure:**
- Vercel: $20 (Pro plan)
- Firebase: $25-100 (Functions, Firestore)
- Cloud Run (MIRA): $50-200 (scales with usage)
- PostgreSQL: $100-300 (depends on storage)
- Valkey: $10-50 (cache layer)
- **Subtotal: $205-670/mo**

**Variable (AI API):**
- Claude Opus: $0.30/unpack × volume
- At 1,000 unpacks/mo: $300
- At 10,000 unpacks/mo: $3,000
- **Target gross margin: 60%** (at scale)

### Monitoring & Observability

**Metrics:**
- **Application:** Firebase Analytics + Mixpanel
- **Infrastructure:** Cloud Monitoring (GCP)
- **Errors:** Sentry
- **Logs:** Cloud Logging (GCP)

**Key Alerts:**
- Function error rate > 5%
- MIRA service response time > 2s
- Daily active users drop > 20%
- Unpack generation failures

---

## Testing Strategy

### Unit Tests (Vitest)
- Services: Firestore CRUD, encryption utilities
- Components: Critical UI logic (draft editor, pattern viz)
- Utilities: Parser, validators, formatters

### E2E Tests (Playwright)
- Onboarding flow (guest → authenticated)
- Journal entry creation + analysis
- Conversation paste + Unpack generation
- Encryption setup + recovery
- Payment flow (Stripe checkout)

### Load Testing
- Locust or Artillery for MIRA endpoint stress testing
- Target: 100 concurrent users, <2s response time

---

## Migration Strategy (Legacy → New Vision)

### Phase 1: Additive Changes (Non-Breaking)
- Add new collections: `journal_entries`, `threads`, `patterns`
- Keep existing collections: `people`, `conversations`, `messages`
- New UI routes: `/journal`, `/threads`, `/patterns`
- Existing routes still work: `/people`

### Phase 2: Dual-Write Period
- New entries write to BOTH old (Person) and new (Thread) models
- UI shows unified view (merge Thread + Person data)
- MIRA integration writes to new model
- Users can continue using old UX

### Phase 3: Migration + Deprecation
- Background job: Migrate existing `people` → `threads`
- Announce deprecation: "People view will be removed in 30 days"
- Redirect `/people` → `/threads`
- Delete old collections after 90 days

---

## Open Technical Decisions

1. **PWA vs Native:** Build as Progressive Web App or invest in native mobile apps later?
2. **MIRA Deployment:** Cloud Run (fully managed) or Fly.io (more control, cheaper)?
3. **Encryption Tradeoff:** Delay encryption setup until second session (reduce friction) or require upfront (max privacy)?
4. **Search Strategy:** Client-side search only (encrypted) or build plaintext index (sacrifice privacy)?
5. **Offline Support:** Queue journal entries for later sync or require network?

---

## Future Architecture (12-18 Months)

### Planned Enhancements

**Voice Journaling:**
- Whisper API for voice-to-text
- Real-time transcription during journal entry

**Mobile Apps:**
- React Native (iOS + Android)
- Share encryption keys via QR code (multi-device)

**Export/Backup:**
- Markdown export (Obsidian-compatible)
- Notion integration (sync as database)

**Enterprise Features:**
- SSO (SAML, OIDC)
- Admin dashboard (user management, usage analytics)
- Shared team playbooks (manager training)

**Advanced AI:**
- Video analysis (paste YouTube link of difficult conversation)
- Image analysis (screenshot of text messages)
- Multi-turn conversation with AI about decision

---

## Appendix: Key Files Reference

| File | Purpose |
|------|---------|
| `apps/web/src/app/(app)/layout.tsx` | Route guards (Auth, Crypto, Onboarding) |
| `apps/web/src/lib/auth-context.tsx` | Authentication + user profile sync |
| `apps/web/src/lib/crypto/` | Encryption utilities, key management |
| `apps/web/src/lib/services/` | API clients (8 files, Firestore CRUD) |
| `apps/functions/src/index.ts` | Cloud Function entry point |
| `apps/functions/src/mira-bridge.ts` | MIRA-OSS integration bridge (TO BE CREATED) |
| `packages/core/src/parser.ts` | WhatsApp/Slack conversation parser |
| `packages/core/src/crypto/` | Shared encryption types |
| `infra/firebase/firestore/firestore.rules` | Firestore security rules |
