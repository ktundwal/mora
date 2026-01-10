# Mora Current Architecture (As-Implemented)

**Last Updated:** January 10, 2026
**Status:** Living Document (reflects production code)

> **⚠️ Important:** This document describes the **CURRENT implementation** as of January 2026. For planned future architecture, see [ARCHITECTURE-VISION.md](ARCHITECTURE-VISION.md).

---

## System Overview

Mora is a Next.js web application for managing personal relationships through AI-powered conversation analysis. Currently built on Firebase with client-side encryption.

```
┌─────────────────────────────────────────────────────────┐
│          Mora Frontend (Next.js 15+/Vercel)             │
│  • React 19, Next.js App Router                         │
│  • Tailwind CSS 4, Radix UI                             │
│  • E2E encryption (Web Crypto API)                      │
│  • Client-side stores (Zustand)                         │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Firebase Ecosystem                         │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   Auth      │  │  Firestore   │  │   Functions    │ │
│  │  (Google    │  │  (encrypted  │  │   (Node.js)    │ │
│  │   OAuth)    │  │   data)      │  │   (stubbed)    │ │
│  └─────────────┘  └──────────────┘  └────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Note:** MIRA-OSS integration is **planned but not implemented**. Current AI calls go through placeholder services.

---

## Frontend Architecture

### Actual Routes (as of Jan 2026)

Based on [apps/web/src/app/](../../apps/web/src/app/):

```
apps/web/src/app/
├── (app)/                        # Protected routes (3-layer guard)
│   ├── layout.tsx                # AuthGuard → CryptoGuard → OnboardingGuard
│   ├── people/                   # People list view (IMPLEMENTED)
│   ├── conversations/            # Conversation threads (IMPLEMENTED)
│   ├── new/                      # New conversation (IMPLEMENTED)
│   ├── settings/                 # User settings (IMPLEMENTED)
│   ├── setup/                    # Encryption setup (IMPLEMENTED)
│   ├── unlock/                   # Device passphrase unlock (IMPLEMENTED)
│   └── recover/                  # Recovery phrase import (IMPLEMENTED)
├── onboarding/                   # 6-step onboarding flow (IMPLEMENTED)
│   ├── page.tsx                  # Landing
│   ├── identity/                 # "What should we call you?"
│   ├── person/                   # Relationship type + name
│   ├── context/                  # "Why they matter?"
│   ├── input/                    # Journal or paste chat
│   └── preview/                  # AI analysis preview
├── login/                        # Authentication (IMPLEMENTED)
└── page.tsx                      # Landing page (IMPLEMENTED)
```

**Routes NOT implemented** (planned in ARCHITECTURE-VISION.md):
- `/journal` - Journal entry UI
- `/threads` - Topic-based threads
- `/patterns` - Pattern dashboard

### Actual Stores (as of Jan 2026)

Based on [apps/web/src/lib/stores/](../../apps/web/src/lib/stores/):

```typescript
// 1. Guest Store (pre-auth, localStorage)
useGuestStore → {
  userDisplayName: string | null;
  guestPerson: { name: string; relationshipType: string } | null;
  guestContext: string | null;
  setUserDisplayName();
  setGuestPerson();
  setGuestContext();
  clearGuestData();
}

// 2. User Store (authenticated profile, Firestore)
useUserStore → {
  profile: UserProfile | null;
  isLoading: boolean;
  fetchProfile();
  updateProfile();
}

// 3. Person Store (people list, Firestore)
usePersonStore → {
  people: Person[];
  isLoading: boolean;
  fetchPeople();
  addPerson();
  deletePerson();
}

// 4. Conversation Store (conversation threads, Firestore)
useConversationStore → {
  conversations: Conversation[];
  isLoading: boolean;
  fetchConversations();
  createConversation();
  deleteConversation();
}

// 5. Entry Store (entries within conversations, Firestore)
useEntryStore → {
  entries: Entry[];
  isLoading: boolean;
  fetchEntries();
  addEntry();
}

// 6. Client Preferences (localStorage)
useClientPreferences → {
  hasAuthenticatedBefore: boolean;
  setHasAuthenticatedBefore();
}
```

**Stores NOT implemented** (planned in ARCHITECTURE-VISION.md):
- `useJournalStore` - Journal entries
- `useThreadStore` - Topic-based threads
- `usePatternStore` - User patterns

### Actual Services (as of Jan 2026)

Based on [apps/web/src/lib/services/](../../apps/web/src/lib/services/):

| Service | Purpose | Status |
|---------|---------|--------|
| `account-service.ts` | User account management | ✅ Implemented |
| `ai-service.ts` | AI proxy (placeholder) | ⚠️ Stubbed |
| `artifact-service.ts` | Conversation artifacts | ✅ Implemented |
| `conversation-service.ts` | Conversation CRUD | ✅ Implemented |
| `entry-service.ts` | Entry CRUD | ✅ Implemented |
| `export-service.ts` | Data export | ✅ Implemented |
| `person-service.ts` | Person CRUD | ✅ Implemented |
| `playbook-service.ts` | Playbook entries | ✅ Implemented |
| `unpack-service.ts` | Unpack CRUD | ✅ Implemented |

---

## Data Architecture (Current State)

### Firestore Collections (Implemented)

Based on [infra/firebase/firestore/firestore.rules](../../infra/firebase/firestore/firestore.rules):

#### 1. `users/{uid}` - User Profiles

```typescript
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
  createdAt: Timestamp;
  schemaVersion: number;
}
```

**Security Rule:** User can only read/write their own profile (`uid` match).

#### 2. `people/{personId}` - People Layer

```typescript
interface Person {
  id: string;
  uid: string;                        // User owner
  displayName: EncryptedEnvelope;     // Encrypted name
  relationshipType: RelationshipType; // 'family' | 'friend' | 'partner' | etc
  importanceNote: EncryptedEnvelope | null;
  profileNotes: EncryptedEnvelope | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
}
```

**Security Rule:** User can only access their own people (`uid` match).

**Sub-collection:** `people/{personId}/entries/{entryId}` - Entries about this person

#### 3. `conversations/{conversationId}` - Conversation Threads

```typescript
interface Conversation {
  id: string;
  uid: string;                        // User owner
  personId: string | null;            // Link to Person (optional)
  title: EncryptedEnvelope;           // Encrypted title
  messageCount: number;
  status: 'active' | 'archived' | 'deleted';
  hasUnpack: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
}
```

**Security Rule:** User can only access their own conversations (`uid` match).

**Sub-collections:**
- `conversations/{conversationId}/messages/{messageId}` - Chat messages
- `conversations/{conversationId}/artifacts/{artifactId}` - Attachments
- `conversations/{conversationId}/unpacks/{unpackId}` - AI analysis
- `conversations/{conversationId}/replyDrafts/{draftId}` - Reply drafts

#### 4. `playbookEntries/{entryId}` - Standalone Playbook

```typescript
interface PlaybookEntry {
  id: string;
  uid: string;
  content: EncryptedEnvelope;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
}
```

**Security Rule:** User can only access their own entries (`uid` match).

### Encrypted Envelope Format

```typescript
interface EncryptedEnvelope {
  ct: string;   // Base64 ciphertext (AES-256-GCM)
  iv: string;   // Base64 IV (12 bytes, unique per operation)
  v: number;    // Version (for future migrations)
}
```

**Encryption Details:**
- Algorithm: AES-256-GCM (Web Crypto API)
- Key storage: IndexedDB (per-device, non-exportable)
- Key derivation: Master key → Device-specific keys
- Recovery: 24-word BIP39 phrase

---

## Authentication & Route Guards

### Three-Layer Route Protection

All routes in `(app)/` are protected by guards in [apps/web/src/app/(app)/layout.tsx](../../apps/web/src/app/(app)/layout.tsx:30-32):

```typescript
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <AuthGuard>           {/* 1. Ensure user authenticated */}
      <CryptoGuard>       {/* 2. Ensure encryption initialized */}
        <OnboardingGuard> {/* 3. Ensure onboarding completed */}
          {children}
        </OnboardingGuard>
      </CryptoGuard>
    </AuthGuard>
  );
}
```

**Order matters:** Each guard checks a prerequisite before allowing access.

### Authentication Flow (Current)

1. **First Visit** → Shows onboarding (6 steps)
   - Uses `GuestStore` (localStorage) for temporary data
   - No account required initially

2. **After Onboarding** → Prompts for authentication
   - Google OAuth via Firebase Auth
   - Creates user profile in Firestore

3. **First Authentication** → Triggers data migration
   - [migrate-guest-data.ts](../../apps/web/src/lib/migrate-guest-data.ts) runs
   - Moves GuestStore data → encrypted Firestore
   - Clears GuestStore

4. **Returning User** → Direct to login
   - `ClientPreferences.hasAuthenticatedBefore` flag
   - Skips onboarding

### Encryption Setup Flow

**New User Path:**
1. Complete onboarding → Authenticate → Redirect to `/setup`
2. `/setup` generates encryption key (IndexedDB) + recovery phrase
3. User saves 24-word recovery phrase
4. Redirect to `/people`

**Existing User Path:**
- Encryption key already in IndexedDB
- Direct to `/people` after auth

**Multi-Device Setup:**
- New device → `/recover` → Import recovery phrase
- Derive same encryption key
- Access encrypted data

---

## Backend Architecture (Current State)

### Firebase Cloud Functions

**Status:** ⚠️ **STUBBED** - Functions exist but not fully implemented

**Location:** [apps/functions/src/index.ts](../../apps/functions/src/index.ts)

**Planned Functions** (from code comments/stubs):
- `analyzeEntry` - AI analysis proxy
- `generateUnpack` - Unpack generation
- `generateDraft` - Reply draft generation
- `stripeWebhook` - Billing webhooks
- `healthCheck` - Service health

**Current Reality:** AI calls are mocked/stubbed in frontend. No production AI integration yet.

### MIRA-OSS Integration

**Status:** ⚠️ **NOT IMPLEMENTED**

**Evidence:**
- `mira-OSS/` directory exists (added in commit `dcaffea`)
- Directory is standalone Python project (86k+ lines)
- No bridge code in `apps/functions/` connecting Firebase → MIRA
- No environment variables for MIRA endpoints
- Firestore rules have no MIRA-related collections

**Planned Integration** (per ADR-001):
- MIRA deployed to Cloud Run/Fly.io
- Firebase Functions as bridge
- PostgreSQL for memory graph (location TBD)

**Current Blocker:** No deployment, no bridge, no connection.

---

## Security Architecture (Current)

### Client-Side Encryption (Implemented)

**Location:** [apps/web/src/lib/crypto/](../../apps/web/src/lib/crypto/)

**Key Components:**
1. **Master Key Generation**
   - 256-bit AES key (Web Crypto API)
   - Stored in IndexedDB (non-exportable)
   - Per-device storage

2. **Recovery Phrase**
   - 24-word BIP39 mnemonic
   - Derives master key on import
   - User responsibility to backup

3. **Field Encryption**
   - Algorithm: AES-256-GCM
   - Unique IV per operation (12 bytes)
   - Authenticated encryption (tamper-proof)

4. **What's Encrypted**
   - All user-generated content (names, notes, messages)
   - All AI-generated content (unpacks, drafts)
   - NOT encrypted: UIDs, timestamps, relationship types (for queries)

### Firestore Security Rules (Implemented)

**Location:** [infra/firebase/firestore/firestore.rules](../../infra/firebase/firestore/firestore.rules)

**Key Patterns:**
```javascript
// Users can only access their own data
allow read, write: if request.auth.uid == resource.data.uid;

// Sub-collections inherit parent ownership
function ownsParentConversation(conversationId) {
  return get(/databases/$(database)/documents/conversations/$(conversationId))
    .data.uid == request.auth.uid;
}
```

**Defense in Depth:**
- Firebase Auth token validation (server-side)
- Firestore rules (per-document checks)
- Client-side encryption (even if rules fail, data is encrypted)

---

## Technology Stack (Actual Dependencies)

Based on [package.json](../../package.json) and workspace package.jsons:

| Layer | Technology | Version | Status |
|-------|------------|---------|--------|
| **Framework** | Next.js | 15+ (inferred) | ✅ Active |
| **UI** | React | 19 | ✅ Active |
| **Styling** | Tailwind CSS | 4 | ✅ Active |
| **Components** | Radix UI | Various | ✅ Active |
| **State** | Zustand | 5 (inferred) | ✅ Active |
| **Auth** | Firebase Auth | Latest | ✅ Active |
| **Database** | Firestore | Latest | ✅ Active |
| **Functions** | Firebase Functions | Gen 2 | ⚠️ Stubbed |
| **Encryption** | Web Crypto API | Native | ✅ Active |
| **Testing** | Vitest + Playwright | Latest | ✅ Active |
| **Build** | Next.js/Turbopack | Built-in | ✅ Active |

**Node Version:** 18-22 (enforced in package.json preinstall)

**Notable Absences:**
- No Supabase dependencies (despite ADR-003)
- No MIRA client libraries
- No PostgreSQL client libraries

---

## Data Flow (Current Implementation)

### Onboarding → Migration Flow

```
1. User lands on / → Redirected to /onboarding
   ↓
2. Complete 6 onboarding steps
   - Data stored in GuestStore (localStorage)
   - No server communication
   ↓
3. Preview analysis (mocked AI)
   ↓
4. Redirect to /login → User authenticates (Google OAuth)
   ↓
5. AuthProvider detects guest data
   ↓
6. migrate-guest-data.ts runs:
   - Check if encryption key exists (IndexedDB)
   - If no key → /setup (generate key + recovery phrase)
   - If key exists → Encrypt guest data
   - Create Person document (Firestore)
   - Create initial Entry document
   - Update user profile: onboardingCompleted = true
   - Clear GuestStore
   ↓
7. Redirect to /people → User sees their first person
```

### Conversation Creation Flow

```
1. User clicks "New Conversation" → /new
   ↓
2. Select person from list (or create new)
   ↓
3. Paste conversation or type manually
   ↓
4. Client encrypts content (Web Crypto API)
   ↓
5. Write to Firestore:
   - conversations/{id} (parent doc)
   - conversations/{id}/messages/{msgId} (sub-collection)
   ↓
6. Redirect to conversation view
   ↓
7. (Future) Generate Unpack → AI analysis
```

**Note:** AI analysis is stubbed - no actual LLM calls yet.

---

## What Exists vs What's Planned

### ✅ Currently Implemented

- Onboarding flow (6 steps)
- Guest data → Authenticated migration
- Client-side encryption (AES-256-GCM)
- People layer (CRUD operations)
- Conversation threads (CRUD operations)
- Multi-device recovery (BIP39 phrase)
- Firestore security rules
- Basic UI (People list, conversation view)

### ⚠️ Partially Implemented

- Firebase Cloud Functions (stubbed, not deployed)
- AI services (mocked responses)
- Unpack generation (placeholder)
- Reply drafts (placeholder)

### ❌ Not Yet Implemented

- MIRA-OSS integration (directory exists, no connection)
- PostgreSQL memory graph
- Journal entry UI (planned route: `/journal`)
- Thread-based organization (planned route: `/threads`)
- Pattern dashboard (planned route: `/patterns`)
- AI memory surfacing
- Proactive insights
- Stripe billing integration

---

## Open Questions & Decisions Needed

### 1. MIRA-OSS Integration Timeline

**Question:** When will MIRA be deployed and integrated?

**Blockers:**
- No MIRA deployment infrastructure (Cloud Run/Fly.io)
- No PostgreSQL provisioning (Cloud SQL, Supabase, or Neon)
- No Firebase Function bridge code
- No user mapping (Firebase UID ↔ MIRA user ID)

**Related:** ADR-001 describes sidecar approach but no implementation exists.

### 2. Supabase vs Firestore Decision

**Question:** Is Supabase actually being used?

**Evidence:**
- ADR-003 says "Status: Accepted" and describes Supabase
- Zero Supabase dependencies in package.json
- ARCHITECTURE-VISION.md mentions "Cloud SQL (or Neon)"
- No DATABASE_URL or Supabase config in .env.example

**Needs Resolution:** Write ADR-004 clarifying actual database decision.

### 3. AI Service Implementation

**Question:** What AI provider is being used?

**Current State:**
- `ai-service.ts` exists but stubbed
- No API keys configured (no .env vars)
- Onboarding preview shows mocked analysis

**Needs Decision:** OpenAI, Anthropic, or Gemini? When to implement?

---

## Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| [apps/web/src/app/(app)/layout.tsx](../../apps/web/src/app/(app)/layout.tsx) | Three-layer route guards | ✅ Implemented |
| [apps/web/src/lib/auth-context.tsx](../../apps/web/src/lib/auth-context.tsx) | Auth provider + migration trigger | ✅ Implemented |
| [apps/web/src/lib/migrate-guest-data.ts](../../apps/web/src/lib/migrate-guest-data.ts) | Guest → authenticated migration | ✅ Implemented |
| [apps/web/src/lib/crypto/](../../apps/web/src/lib/crypto/) | Encryption utilities | ✅ Implemented |
| [apps/web/src/lib/stores/](../../apps/web/src/lib/stores/) | Zustand stores (6 stores) | ✅ Implemented |
| [apps/web/src/lib/services/](../../apps/web/src/lib/services/) | Firestore CRUD services (9 files) | ✅ Implemented |
| [infra/firebase/firestore/firestore.rules](../../infra/firebase/firestore/firestore.rules) | Security rules | ✅ Implemented |
| [apps/functions/src/index.ts](../../apps/functions/src/index.ts) | Cloud Functions entry | ⚠️ Stubbed |
| [mira-OSS/](../../mira-OSS/) | Memory engine (external) | ⚠️ Not connected |

---

## Migration Path to Vision Architecture

To go from current state → vision architecture (ARCHITECTURE-VISION.md):

### Phase 1: MIRA Integration (Weeks 1-4)
1. Deploy MIRA-OSS to Cloud Run
2. Provision PostgreSQL (decide: Supabase, Cloud SQL, or Neon)
3. Build Firebase Function bridge
4. Implement user ID mapping
5. Test end-to-end: Frontend → Function → MIRA → PostgreSQL

### Phase 2: New UX (Weeks 5-8)
1. Build journal entry UI (`/journal` route)
2. Create Thread model (Firestore + MIRA entities)
3. Build thread list view (`/threads` route)
4. Add pattern dashboard (`/patterns` route)
5. Migrate existing data (Person → Thread)

### Phase 3: Advanced Features (Weeks 9-12)
1. Proactive memory surfacing
2. Pattern detection dashboard
3. Voice journaling (Whisper API)
4. Export/backup improvements

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-01-10 | Initial creation - documented as-implemented state | Claude Sonnet 4.5 |

---

## See Also

- [ARCHITECTURE-VISION.md](ARCHITECTURE-VISION.md) - Planned future architecture
- [CLAUDE.md](../../CLAUDE.md) - Development guide
- [README.md](../../README.md) - Project overview
- [docs/decisions/](../decisions/) - Architecture Decision Records
