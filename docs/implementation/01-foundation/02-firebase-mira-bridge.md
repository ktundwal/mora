# 01-02: Firebase-MIRA Bridge Function

**Status:** todo
**Priority:** p0 (critical)
**Estimate:** 3d
**Owner:** Unassigned
**Dependencies:** [01-01] (MIRA deployed)

## Context

Firebase Cloud Functions need to call MIRA-OSS for journal entry analysis. This bead creates the bridge layer that:
1. Receives requests from Mora frontend
2. Validates authentication + quota
3. Decrypts content (if E2E encrypted)
4. Calls MIRA /chat endpoint
5. Extracts topics/entities from response
6. Syncs metadata to Firestore
7. Re-encrypts and returns to client

**Related:**
- [Decision: MIRA-OSS Integration](../../docs/decisions/001-mira-oss-integration.md)
- [ARCHITECTURE.md](../../docs/design/ARCHITECTURE.md#backend-architecture)

## Acceptance Criteria

- [ ] `analyzeEntry` Cloud Function created (Gen 2)
- [ ] Validates user is authenticated (Firebase Auth)
- [ ] Checks quota (free tier: 10 entries/month)
- [ ] Decrypts content if encrypted (via decryptFields utility)
- [ ] Calls MIRA /chat with decrypted text
- [ ] Extracts topics from MIRA entities
- [ ] Creates/updates Firestore `journal_entries` document
- [ ] Creates/updates Firestore `threads` documents
- [ ] Returns analysis + topics + memories to client
- [ ] Error handling: MIRA timeout, API errors, quota exceeded
- [ ] Unit tests: happy path + error cases

## Technical Notes

### Function Signature

```typescript
// apps/functions/src/index.ts

interface AnalyzeEntryRequest {
  content: string | EncryptedEnvelope;  // Plain or encrypted
  entryType: 'journal' | 'conversation' | 'decision';
  metadata?: {
    mood?: string;
    tags?: string[];
  };
}

interface AnalyzeEntryResponse {
  entryId: string;
  analysis: string;          // AI-generated insights
  topics: string[];          // ["work", "manager", "anxiety"]
  threads: Thread[];         // Auto-created/updated threads
  surfacedMemories: Memory[]; // Relevant past memories
  miraMessageId: string;     // Link to MIRA PostgreSQL
}

export const analyzeEntry = onCall<AnalyzeEntryRequest>({
  cors: true,
  secrets: [miraServiceKey],
  region: 'us-central1',
}, async (request): Promise<AnalyzeEntryResponse> => {
  // Implementation here
});
```

### Implementation Steps

**1. Validate & Decrypt**
```typescript
// Check auth
if (!request.auth) {
  throw new HttpsError('unauthenticated', 'Sign-in required');
}

const uid = request.auth.uid;

// Check quota
const profile = await getUserProfile(uid);
if (!canCreateEntry(profile)) {
  throw new HttpsError('resource-exhausted', 'Entry quota exceeded. Upgrade to Plus.');
}

// Decrypt content if needed
let plaintext: string;
if (typeof request.data.content === 'string') {
  plaintext = request.data.content;
} else {
  // Encrypted
  const masterKey = await getUserMasterKey(uid); // From secure storage
  plaintext = await decryptString(request.data.content, masterKey);
}
```

**2. Call MIRA**
```typescript
const miraUserId = await ensureMiraUserMapping(uid);

const miraResponse = await fetch(`${MIRA_URL}/chat`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${miraServiceKey.value()}`,
    'X-Mora-User-Id': miraUserId,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: plaintext,
    metadata: {
      source: 'mora',
      entryType: request.data.entryType,
    }
  }),
  signal: AbortSignal.timeout(30000), // 30s timeout
});

if (!miraResponse.ok) {
  throw new HttpsError('internal', `MIRA error: ${miraResponse.statusText}`);
}

const miraData = await miraResponse.json();
```

**3. Extract Topics**
```typescript
// MIRA returns entities: [{ name: "Sarah", type: "PERSON" }, { name: "work", type: "THEME" }]
const topics = miraData.entities
  .map(e => e.name.toLowerCase())
  .filter(name => name.length > 2); // Skip very short tags

// Deduplicate
const uniqueTopics = Array.from(new Set(topics));
```

**4. Sync to Firestore**
```typescript
// Create journal entry
const entryRef = db.collection('journal_entries').doc();
await entryRef.set({
  id: entryRef.id,
  uid,
  preview: plaintext.slice(0, 100),
  content: await encryptString(plaintext, masterKey), // Re-encrypt for storage
  topics: uniqueTopics,
  entryType: request.data.entryType,
  miraMessageId: miraData.messageId,
  miraConversationId: miraData.conversationId,
  createdAt: FieldValue.serverTimestamp(),
  schemaVersion: 1,
});

// Create/update threads
const threads = await syncThreads(uid, uniqueTopics, miraData.entities, entryRef.id);

// Return
return {
  entryId: entryRef.id,
  analysis: miraData.content,
  topics: uniqueTopics,
  threads,
  surfacedMemories: miraData.surfaced_memories || [],
  miraMessageId: miraData.messageId,
};
```

### Error Handling

```typescript
try {
  // ... implementation
} catch (error) {
  if (error.code === 'ECONNABORTED') {
    throw new HttpsError('deadline-exceeded', 'MIRA timeout. Try again.');
  }

  if (error.code === 'ECONNREFUSED') {
    throw new HttpsError('unavailable', 'MIRA service unavailable.');
  }

  logger.error('analyzeEntry error', { uid, error });
  throw new HttpsError('internal', 'Analysis failed. Contact support.');
}
```

## Testing

### Unit Tests (Vitest)

```typescript
// apps/functions/src/__tests__/analyze-entry.test.ts

describe('analyzeEntry', () => {
  it('should reject unauthenticated requests', async () => {
    const req = { data: { content: 'test' } };
    await expect(analyzeEntry(req)).rejects.toThrow('unauthenticated');
  });

  it('should decrypt encrypted content', async () => {
    // Mock: user with encrypted entry
    // Assert: plaintext sent to MIRA
  });

  it('should sync topics to threads', async () => {
    // Mock: MIRA returns entities
    // Assert: threads created/updated in Firestore
  });

  it('should handle MIRA timeout gracefully', async () => {
    // Mock: MIRA fetch timeout
    // Assert: HttpsError with 'deadline-exceeded'
  });
});
```

### Integration Test (Local Emulator)

```bash
# Start Firebase emulators
npm run emulators

# Call function
curl -X POST http://localhost:5001/mora-dev/us-central1/analyzeEntry \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "content": "Had a tough meeting with Sarah today.",
      "entryType": "journal"
    }
  }'

# Verify Firestore: journal_entries + threads created
```

## Rollout Plan

1. Deploy to dev Firebase project
2. Test with 2-3 test accounts
3. Monitor for errors (Sentry, Cloud Logging)
4. Deploy to production
5. Enable for beta users

## Risks

- **Encryption key availability:** If user hasn't set up encryption, function will fail
  - **Mitigation:** Support plaintext entries for non-encrypted users
- **MIRA latency:** If /chat takes >5s, bad UX
  - **Mitigation:** Implement streaming response (Phase 2)
- **Database sync failures:** Firestore write fails, but MIRA processed entry
  - **Mitigation:** Retry logic + idempotency keys

## Related Beads

- [01-01: Deploy MIRA-OSS](./01-mira-deployment.md)
- [01-03: MIRA User Mapping](./03-mira-user-mapping.md)
- [01-04: Journal Entry UI](./04-journal-entry-ui.md)
