# Specification: WhatsApp Conversation Parser & Paste Flow

**Document ID:** SPEC-001  
**Created:** December 18, 2025  
**Status:** Draft  

---

## 1. Purpose & Scope

**Purpose:** Enable users to import WhatsApp conversations by pasting exported chat text, parsing it into structured messages, and saving to Firestore for analysis.

**Scope:**
- ✅ **Included:** Paste text input, parsing, speaker mapping, save to Firestore, conversations list, conversation detail view
- ❌ **Excluded:** File upload (.txt), automatic speaker detection via AI, WhatsApp direct integration

**Target User:** Anxious-Preoccupied partner who just received a difficult text and wants to quickly capture the conversation for analysis.

**Success Metric:** User can go from "copied WhatsApp text" → "saved conversation" in under 60 seconds.

---

## 2. Definitions

| Term | Definition |
|------|------------|
| **Raw Text** | Unprocessed text copied from WhatsApp export |
| **Parsed Message** | Single message extracted with speaker, text, timestamp |
| **Speaker Mapping** | User assignment of raw names to `User` / `Partner` / `Unknown` |
| **Conversation** | Top-level document containing metadata about the chat |
| **Message** | Sub-document under conversation containing individual message data |

---

## 3. Requirements

### Functional Requirements

| ID | Requirement |
|----|-------------|
| **REQ-001** | User can paste WhatsApp chat text into a textarea |
| **REQ-002** | System parses text and displays preview of extracted messages |
| **REQ-003** | System detects unique speaker names from parsed text |
| **REQ-004** | User can map each detected speaker to `User`, `Partner`, or `Unknown` |
| **REQ-005** | User must check "I have permission" checkbox before saving |
| **REQ-006** | User can set a title for the conversation (auto-generated default) |
| **REQ-007** | System saves conversation + messages to Firestore on submit |
| **REQ-008** | User can view list of their conversations with title, date, message count |
| **REQ-009** | User can click a conversation to view messages in read-only format |
| **REQ-010** | User can delete a conversation (cascades to messages) |
| **REQ-011** | Parse errors are highlighted for user review (not silently discarded) |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| **NFR-001** | Parser handles US date format (M/D/YY) and EU format (DD/MM/YY) |
| **NFR-002** | Parser handles 12-hour and 24-hour time formats |
| **NFR-003** | Parser handles multi-line messages (continuation lines) |
| **NFR-004** | Parser filters out WhatsApp system messages |
| **NFR-005** | Page load < 2s on 3G (mobile-first) |
| **NFR-006** | Autosave draft to localStorage to prevent data loss |
| **NFR-007** | Maximum 5000 messages per conversation (UX limit) |

### Constraints

| ID | Constraint |
|----|------------|
| **CON-001** | Must use existing `Conversation` and `Message` types from `@mora/core` |
| **CON-002** | Parser must live in `packages/core` (shared with functions) |
| **CON-003** | Must use Zustand for state, not React Context |
| **CON-004** | Must use shadcn/ui components |
| **CON-005** | No server-side parsing in v1 (client-only) |

---

## 4. Data Model

### New Types (add to `packages/core/src/types.ts`)

```typescript
// ============================================================================
// WhatsApp Parser Types
// ============================================================================

/** Result of parsing a single line of WhatsApp text */
export interface ParsedMessage {
  speaker: string;           // Raw speaker name (before mapping)
  text: string;              // Message content
  timestamp: string | null;  // ISO string if detected, null otherwise
  rawLine: string;           // Original line for debugging
  lineNumber: number;        // 1-indexed line number in source
}

/** Error encountered during parsing */
export interface ParseError {
  lineNumber: number;
  rawLine: string;
  reason: 'no_speaker' | 'malformed_timestamp' | 'system_message' | 'empty';
}

/** Complete result of parsing WhatsApp text */
export interface ParseResult {
  messages: ParsedMessage[];
  detectedSpeakers: string[];  // Unique speaker names found
  errors: ParseError[];
  stats: {
    totalLines: number;
    parsedCount: number;
    errorCount: number;
    systemMessagesFiltered: number;
  };
}

/** User's assignment of raw speaker names to canonical roles */
export interface SpeakerMapping {
  [rawName: string]: Speaker;  // 'User' | 'Partner' | 'Unknown'
}

/** Input for creating a new conversation */
export interface CreateConversationInput {
  title: string;
  rawText: string;
  parsedMessages: ParsedMessage[];
  speakerMapping: SpeakerMapping;
}
```

### Firestore Structure

```
conversations/{conversationId}
├── id: string
├── uid: string (owner)
├── title: string
├── summary: string | null
├── createdAt: Timestamp
├── updatedAt: Timestamp
├── messageCount: number
├── status: 'active' | 'archived' | 'deleted'
├── hasUnpack: false
├── lastUnpackAt: null
├── schemaVersion: 1
│
└── messages/{messageId}  (sub-collection)
    ├── id: string
    ├── conversationId: string
    ├── speaker: 'User' | 'Partner' | 'Unknown'
    ├── text: string
    ├── timestamp: string | null
    ├── originalRaw: string
    ├── order: number (0-indexed)
    └── schemaVersion: 1
```

---

## 5. Parser Design

### File: `packages/core/src/parser.ts`

```typescript
/**
 * Parse raw WhatsApp export text into structured messages.
 * 
 * Handles formats:
 * - [12/18/24, 10:30:15 AM] John: Hello
 * - [18/12/24, 10:30:15] John: Hello (EU)
 * - 12/18/24, 10:30 AM - John: Hello (no brackets)
 * 
 * Multi-line messages: Lines without timestamp are appended to previous.
 * System messages: Filtered (encryption notices, etc.)
 */
export function parseWhatsAppText(rawText: string): ParseResult;

/**
 * Apply speaker mapping to parsed messages, converting to final Message format.
 */
export function applyMapping(
  messages: ParsedMessage[],
  mapping: SpeakerMapping,
  conversationId: string
): Omit<Message, 'id'>[];
```

### Regex Patterns

```typescript
// Pattern 1: [M/D/YY, H:MM:SS AM/PM] Speaker: 
const PATTERN_US_BRACKETS = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\]\s*([^:]+):\s*(.+)/i;

// Pattern 2: [DD/MM/YY, HH:MM:SS] Speaker:
const PATTERN_EU_BRACKETS = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.+)/i;

// Pattern 3: M/D/YY, H:MM AM - Speaker:
const PATTERN_DASH = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*-\s*([^:]+):\s*(.+)/i;

// System message patterns (to filter)
const SYSTEM_PATTERNS = [
  /messages and calls are end-to-end encrypted/i,
  /you created group/i,
  /added you/i,
  /changed the subject/i,
  /left$/i,
  /joined using this group/i,
];
```

---

## 6. UI Components

### Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/conversations` | `ConversationsPage` | List user's conversations |
| `/new` | `NewConversationPage` | Multi-step paste flow |
| `/conversations/[id]` | `ConversationDetailPage` | View single conversation |

### File Structure

```
apps/web/src/
├── app/(app)/                      # Protected route group
│   ├── layout.tsx                  # Bottom nav + AuthGuard
│   ├── conversations/
│   │   ├── page.tsx               # List view
│   │   └── [id]/
│   │       └── page.tsx           # Detail view
│   └── new/
│       └── page.tsx               # Paste flow (multi-step)
│
├── components/
│   ├── ui/                         # shadcn (auto-generated)
│   ├── conversations/
│   │   ├── conversation-list.tsx   # List with search
│   │   ├── conversation-card.tsx   # Single list item
│   │   └── message-bubble.tsx      # Styled message display
│   └── new-conversation/
│       ├── paste-step.tsx          # Step 1: Textarea
│       ├── preview-step.tsx        # Step 2: Parse preview
│       ├── mapping-step.tsx        # Step 3: Speaker assignment
│       └── confirm-step.tsx        # Step 4: Title + save
│
└── lib/
    ├── stores/
    │   └── conversation-store.ts   # Zustand store
    └── services/
        └── conversation-service.ts # Firestore CRUD
```

### New Conversation Flow (Wireframe)

```
┌────────────────────────────────────┐
│  ← Back            New Conversation│
├────────────────────────────────────┤
│                                    │
│  Step 1 of 4: Paste                │
│  ────────────────                  │
│  ┌────────────────────────────────┐│
│  │ Paste your WhatsApp chat here  ││
│  │                                ││
│  │                                ││
│  │                                ││
│  └────────────────────────────────┘│
│                                    │
│  ☐ I have permission to upload    │
│    this conversation              │
│                                    │
│  ┌────────────────────────────────┐│
│  │         Parse & Preview        ││
│  └────────────────────────────────┘│
│                                    │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│  ← Back            New Conversation│
├────────────────────────────────────┤
│                                    │
│  Step 3 of 4: Who's Who?           │
│  ────────────────                  │
│  We found 2 speakers:              │
│                                    │
│  "John"     →  [▼ Partner    ]     │
│  "Jane"     →  [▼ Me (User)  ]     │
│                                    │
│  ┌────────────────────────────────┐│
│  │            Continue            ││
│  └────────────────────────────────┘│
│                                    │
└────────────────────────────────────┘
```

---

## 7. State Management

### Zustand Store: `conversation-store.ts`

```typescript
interface ConversationState {
  // List state
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  
  // New conversation draft
  draft: {
    rawText: string;
    parseResult: ParseResult | null;
    speakerMapping: SpeakerMapping;
    title: string;
    step: 1 | 2 | 3 | 4;
  };
  
  // Actions
  fetchConversations: () => Promise<void>;
  setDraftText: (text: string) => void;
  parseDraft: () => void;
  setSpeakerMapping: (mapping: SpeakerMapping) => void;
  setDraftTitle: (title: string) => void;
  saveConversation: () => Promise<string>; // Returns conversation ID
  resetDraft: () => void;
  deleteConversation: (id: string) => Promise<void>;
}
```

---

## 8. Security

### Firestore Rules (already configured)

```javascript
match /conversations/{conversationId} {
  allow create: if isCreatingOwned();
  allow read, update, delete: if isCurrentUser();

  match /messages/{messageId} {
    allow read, write: if ownsParentConversation(conversationId);
  }
}
```

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| **PII in logs** | Never log `rawText` or message content |
| **Cross-user access** | Firestore rules enforce `uid` match |
| **Large payloads** | Client-side limit of 5000 messages |
| **XSS in message text** | React escapes by default; don't use `dangerouslySetInnerHTML` |

---

## 9. Acceptance Criteria

### Unit Tests (`packages/core/src/parser.test.ts`)

- [ ] Parses US date format `[12/18/24, 10:30:15 AM]`
- [ ] Parses EU date format `[18/12/24, 10:30:15]`
- [ ] Parses dash format `12/18/24, 10:30 AM - John:`
- [ ] Handles multi-line messages (appends to previous)
- [ ] Filters system messages (encryption notice, etc.)
- [ ] Returns empty array for empty input
- [ ] Returns errors for unparseable lines
- [ ] Detects unique speakers correctly

### E2E Tests (`apps/web/tests/e2e/new-conversation.spec.ts`)

- [ ] Authenticated user can access `/new`
- [ ] Paste text → Preview shows messages
- [ ] Speaker mapping UI shows detected speakers
- [ ] Can assign speakers and save
- [ ] Saved conversation appears in `/conversations`
- [ ] Can view conversation detail with messages
- [ ] Can delete conversation

### Manual QA

- [ ] Mobile viewport (375px) is usable
- [ ] Permission checkbox is required
- [ ] Parse errors are visible to user
- [ ] Back button preserves draft state
- [ ] Empty state shows helpful message

---

## 10. Out of Scope

| Feature | Reason | When |
|---------|--------|------|
| `.txt` file upload | Simplify v1 UX | v1.1 |
| AI speaker detection | Not needed if only 2 speakers | v2 |
| Edit messages after save | Complexity | v2 |
| WhatsApp direct integration | Platform TOS risk | Never v1 |
| Batch import | Edge case | v2 |

---

## 11. Implementation Order

1. **Parser** (`packages/core/src/parser.ts`) + unit tests
2. **Types** (add to `packages/core/src/types.ts`)
3. **shadcn components** (install button, card, textarea, dialog, toast)
4. **Conversation service** (`apps/web/src/lib/services/`)
5. **Zustand store** (`apps/web/src/lib/stores/`)
6. **App layout with nav** (`apps/web/src/app/(app)/layout.tsx`)
7. **New Conversation page** (multi-step flow)
8. **Conversations List page**
9. **Conversation Detail page**
10. **E2E tests**

**Estimated effort:** 6-8 hours

---

## 12. Open Questions

| Question | Recommendation | Decision |
|----------|----------------|----------|
| Default title format? | "Conversation from Dec 18, 2025" | TBD |
| Show raw line on error? | Yes, with yellow highlight | TBD |
| Max textarea characters? | 500,000 (~10k messages) | TBD |
| Persist draft on page leave? | Yes, localStorage | TBD |

---

## Appendix A: WhatsApp Export Samples

### iOS Export (US)
```
[12/18/24, 10:30:15 AM] John: Hey, how are you?
[12/18/24, 10:30:45 AM] Jane: I'm good! Just got back from the store.
Did you need anything?
[12/18/24, 10:31:02 AM] John: No, I'm all set. Thanks!
```

### Android Export (EU)
```
18/12/24, 10:30 - John: Hey, how are you?
18/12/24, 10:30 - Jane: I'm good! Just got back from the store.
Did you need anything?
18/12/24, 10:31 - John: No, I'm all set. Thanks!
```

### System Messages (to filter)
```
[12/18/24, 10:00:00 AM] Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
[12/18/24, 10:05:00 AM] John created group "Family Chat"
[12/18/24, 10:06:00 AM] John added Jane
```
