# 01-03: MIRA User ID Mapping

**Status:** todo
**Priority:** p0 (critical)
**Estimate:** 1d
**Owner:** Unassigned
**Dependencies:** [01-01] (MIRA deployed)

## Context

Firebase Auth uses Firebase UIDs to identify users. MIRA-OSS uses its own internal user IDs. We need a mapping system to bridge these two identity systems.

**Related:**
- [ADR-001: MIRA-OSS Integration](../../decisions/001-mira-oss-integration.md)
- [01-01: Deploy MIRA-OSS](./01-mira-deployment.md)
- [01-02: Firebase-MIRA Bridge](./02-firebase-mira-bridge.md)

## Acceptance Criteria

- [ ] Firestore collection `mira_users` created
- [ ] Function `ensureMiraUserMapping()` implemented
- [ ] MIRA user created via `/users` endpoint on first entry
- [ ] Mapping stored in Firestore for fast lookup
- [ ] Security rules prevent cross-user access
- [ ] Unit tests for mapping logic
- [ ] Handle race conditions (concurrent first entries)

## Technical Notes

### Firestore Schema

**Collection:** `mira_users/{firebaseUid}`

```typescript
interface MiraUserMapping {
  firebaseUid: string;      // Document ID
  miraUserId: string;       // MIRA's internal user ID
  miraEmail: string;        // Email used in MIRA
  createdAt: Timestamp;
  lastSyncedAt: Timestamp;
}
```

### Implementation

**Location:** `apps/functions/src/lib/mira-user-mapping.ts`

```typescript
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';
import { defineSecret } from 'firebase-functions/params';

const miraServiceKey = defineSecret('MIRA_SERVICE_KEY');
const MIRA_URL = process.env.MIRA_URL || 'https://mora-mira-[hash].run.app';

export async function ensureMiraUserMapping(
  firebaseUid: string,
  email: string
): Promise<string> {
  const db = getFirestore();
  const mappingRef = db.collection('mira_users').doc(firebaseUid);

  // Check if mapping exists
  const mappingSnap = await mappingRef.get();

  if (mappingSnap.exists) {
    const data = mappingSnap.data() as MiraUserMapping;

    // Update last synced timestamp
    await mappingRef.update({
      lastSyncedAt: FieldValue.serverTimestamp()
    });

    return data.miraUserId;
  }

  // Create new MIRA user via API
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(MIRA_URL);

  const response = await client.request({
    url: `${MIRA_URL}/users`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${miraServiceKey.value()}`,
      'Content-Type': 'application/json'
    },
    data: {
      email,
      firebaseUid,
      metadata: {
        source: 'mora',
        createdAt: new Date().toISOString()
      }
    }
  });

  if (response.status !== 201) {
    throw new Error(`Failed to create MIRA user: ${response.statusText}`);
  }

  const { userId: miraUserId } = response.data;

  // Store mapping in Firestore
  await mappingRef.set({
    firebaseUid,
    miraUserId,
    miraEmail: email,
    createdAt: FieldValue.serverTimestamp(),
    lastSyncedAt: FieldValue.serverTimestamp()
  });

  return miraUserId;
}
```

### Security Rules

**Location:** `infra/firebase/firestore/firestore.rules`

```javascript
match /mira_users/{firebaseUid} {
  // Users can only read their own mapping
  allow read: if request.auth.uid == firebaseUid;

  // Only Cloud Functions can write (via admin SDK)
  allow write: if false;
}
```

### Error Handling

```typescript
export async function ensureMiraUserMapping(
  firebaseUid: string,
  email: string
): Promise<string> {
  try {
    // ... implementation above
  } catch (error) {
    // Log but don't fail - return placeholder
    logger.error('MIRA user mapping failed', { firebaseUid, error });

    // If MIRA is down, store pending mapping
    await storePendingMapping(firebaseUid, email);

    // Return temporary ID (will be resolved on next sync)
    return `pending-${firebaseUid}`;
  }
}

async function storePendingMapping(firebaseUid: string, email: string) {
  const db = getFirestore();
  await db.collection('mira_users_pending').doc(firebaseUid).set({
    firebaseUid,
    email,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    retryCount: 0
  });
}
```

## Testing

### Unit Tests

```typescript
// apps/functions/src/__tests__/mira-user-mapping.test.ts

describe('ensureMiraUserMapping', () => {
  it('should return existing mapping', async () => {
    // Mock: Firestore has existing mapping
    const miraUserId = await ensureMiraUserMapping('firebase-uid-123', 'test@mora.app');
    expect(miraUserId).toBe('mira-user-456');
  });

  it('should create new MIRA user on first call', async () => {
    // Mock: Firestore has no mapping
    // Mock: MIRA /users endpoint returns 201
    const miraUserId = await ensureMiraUserMapping('firebase-uid-new', 'new@mora.app');
    expect(miraUserId).toMatch(/^mira-/);
  });

  it('should handle MIRA API failures gracefully', async () => {
    // Mock: MIRA /users endpoint returns 500
    const miraUserId = await ensureMiraUserMapping('firebase-uid-fail', 'fail@mora.app');
    expect(miraUserId).toBe('pending-firebase-uid-fail');
  });

  it('should prevent race conditions', async () => {
    // Two concurrent calls for same user
    const [result1, result2] = await Promise.all([
      ensureMiraUserMapping('firebase-uid-race', 'race@mora.app'),
      ensureMiraUserMapping('firebase-uid-race', 'race@mora.app')
    ]);
    expect(result1).toBe(result2); // Same MIRA user ID
  });
});
```

### Integration Test

```bash
# Call analyzeEntry (triggers mapping)
curl -X POST http://localhost:5001/mora-dev/us-central1/analyzeEntry \
  -H "Authorization: Bearer <test-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "content": "Test entry",
      "entryType": "journal"
    }
  }'

# Verify mapping created in Firestore
firebase firestore:get mira_users/firebase-uid-123
# Should show: miraUserId, miraEmail, createdAt
```

## Rollout Plan

1. Deploy mapping function to dev environment
2. Test with 2-3 Firebase test accounts
3. Verify MIRA users created in PostgreSQL
4. Deploy to production
5. Monitor for mapping failures

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| MIRA API down during user creation | User can't create entries | Store pending mappings, retry with background job |
| Race condition (2 concurrent first entries) | Duplicate MIRA users created | Use Firestore transaction or MIRA idempotency key |
| Mapping data loss | User loses history | Regular Firestore backups, MIRA keeps source firebaseUid |
| Email change | Mapping becomes stale | Update mapping when user changes email in Firebase |

## Future Enhancements

**Background Sync Job:**
```typescript
// Retry pending mappings every 5 minutes
export const retryPendingMappings = onSchedule('every 5 minutes', async () => {
  const db = getFirestore();
  const pending = await db.collection('mira_users_pending')
    .where('status', '==', 'pending')
    .where('retryCount', '<', 5)
    .limit(10)
    .get();

  for (const doc of pending.docs) {
    const { firebaseUid, email } = doc.data();
    try {
      await ensureMiraUserMapping(firebaseUid, email);
      await doc.ref.delete(); // Success, remove pending
    } catch (error) {
      await doc.ref.update({
        retryCount: FieldValue.increment(1),
        lastRetry: FieldValue.serverTimestamp()
      });
    }
  }
});
```

## Related Beads

- [01-01: Deploy MIRA-OSS](./01-mira-deployment.md)
- [01-02: Firebase-MIRA Bridge](./02-firebase-mira-bridge.md)
- [01-04: Journal Entry UI](./04-journal-entry-ui.md)
