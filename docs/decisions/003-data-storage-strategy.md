# ADR 003: Data Storage Strategy - Supabase + Firestore with On-Device AI Path

**Status:** Proposed (NOT Implemented)
**Date:** 2026-01-10
**Deciders:** Kapil Tundwal, Claude Sonnet 4.5
**Related:** [ADR-001 MIRA-OSS Integration](001-mira-oss-integration.md)

> **⚠️ Implementation Status:**
>
> This ADR describes a **PROPOSED architecture**, not the current implementation.
>
> **Current Reality (as of Jan 10, 2026):**
> - ✅ Firestore is implemented and active
> - ❌ Supabase is NOT implemented (no dependencies, no config)
> - ❌ MIRA-OSS is NOT connected (directory exists, no bridge code)
> - ❌ On-device AI is NOT implemented
>
> The Supabase vs Cloud SQL decision needs resolution. Consider writing ADR-004 if Cloud SQL or another option is chosen instead.

---

## Context

Mora requires a data storage strategy that supports:
1. **Memory graph storage** for MIRA-OSS (PostgreSQL required)
2. **Offline-first UX** for journal entries (instant save, spotty connections)
3. **Privacy-first architecture** enabling future on-device AI processing
4. **Multi-device sync** (optional, user-controlled)
5. **Cost efficiency** at scale (zero users → 10k+ users)

### Initial Considerations

**Firebase context:**
- Already using Firebase Auth (identity layer)
- Already provisioned Firestore (before MIRA-OSS discovery)
- Familiar ecosystem (Google Cloud)

**MIRA-OSS requirements:**
- Requires PostgreSQL or SQLite for memory operations
- Firestore cannot provide relational queries, full-text search, or vector operations
- MIRA's tool architecture expects PostgreSQL features

**Future vision:**
- On-device AI processing (WebLLM, Transformers.js)
- "Your data never leaves your device" as core product differentiator
- Zero server communication in "Privacy Mode"

---

## Decision

We will use a **hybrid, layered architecture** with three data storage layers:

### Layer 1: Local Storage (IndexedDB) - Always Present

**Purpose:** Offline-first, instant save, encryption key storage

**Technology:** IndexedDB (Web Storage API)

**Stores:**
- Encrypted journal entries (client-side AES-256-GCM)
- User encryption keys (per-device)
- Pending sync queue (when offline)
- On-device AI models (Phase 2: 1-2GB model weights)

**Why:**
- Available in all browsers (100% compatibility)
- Supports 500MB - 2GB storage per origin
- Synchronous operations (instant UI feedback)
- Works offline by default

### Layer 2: Cloud Sync (Firestore) - Optional

**Purpose:** Multi-device sync, real-time updates, cloud backup

**Technology:** Google Cloud Firestore

**Stores:**
- Encrypted entry envelopes (E2EE, server can't decrypt)
- UI metadata (timestamps, entry IDs, topics)
- User preferences (opt-in sync settings)

**Why:**
- Offline-first by design (local cache + cloud sync)
- Real-time listeners (UI updates across devices)
- Automatic conflict resolution
- Free tier: 1GB storage, 10GB bandwidth/month
- Paid tier: ~$0.06/100k operations (negligible at scale)

**Opt-out:** Users in "Privacy Mode" skip Firestore entirely (Layer 1 only)

### Layer 3: Memory Graph (Supabase PostgreSQL) - For MIRA

**Purpose:** AI memory operations, knowledge graph, vector search

**Technology:** Supabase (managed PostgreSQL)

**Stores:**
- Memory graph (entities, relationships, patterns)
- Vector embeddings (semantic search)
- AI-generated insights (topics, patterns, themes)
- User activity logs (for memory decay calculation)

**Why:**
- **Free tier:** $0 for 500MB (sufficient for beta)
- **Paid tier:** $25/mo for 8GB (covers 200+ users)
- **PostgreSQL native:** MIRA-OSS expects PostgreSQL features
- **Row-Level Security:** Built-in user isolation (RLS policies)
- **Dashboard:** SQL editor, table viewer (better DX than Cloud SQL)
- **No vendor lock-in:** Standard PostgreSQL, easy migration

**vs Cloud SQL:**
- Cloud SQL: $40/mo minimum (idle capacity waste at 0 users)
- Supabase: $0 until usage exceeds free tier
- Savings: $480/year in Year 1

**Opt-out:** Users in "Privacy Mode" skip Supabase (on-device AI only)

---

## Architecture Diagrams

### Phase 1: MVP with Cloud AI (Months 1-3)

```
Browser (Next.js PWA)
    ├─ IndexedDB: Encrypted entries, encryption keys
    ├─ Web Crypto API: Client-side AES-256-GCM encryption
    └─ Firebase Auth: User identity

    ↓ User writes entry

IndexedDB.entries.add(encrypted) → Instant save (offline-first)

    ↓ When online

Firestore.collection('entries').add(encrypted) → Cloud sync (opt-in)

    ↓ Trigger

Firebase Cloud Function 'analyzeEntry'
    ├─ Validate auth + quota
    ├─ Decrypt content (server-side, for AI processing)
    └─ Call MIRA API

    ↓

MIRA-OSS (Cloud Run)
    ├─ User context injection (user_id from Firebase UID)
    ├─ Extract topics, entities, patterns
    ├─ Link to existing memories
    └─ Return AI insights

    ↓

Supabase PostgreSQL
    ├─ Store memory graph (with RLS policies)
    ├─ User-scoped queries (automatic isolation)
    └─ Vector search (pgvector extension)

    ↓

Firebase Function returns:
    {
      topics: ['work', 'stress', 'manager'],
      patterns: ['defensive reaction detected'],
      relatedMemories: [...]
    }

    ↓

UI displays insights + updates Firestore metadata
```

### Phase 2: Privacy Mode with On-Device AI (Months 4-6)

```
Browser (Privacy Mode Enabled)
    ├─ IndexedDB: All user data (never synced)
    ├─ WebLLM: Phi-3-mini (1.5GB, downloaded once)
    ├─ Transformers.js: Embeddings + vector ops
    └─ Vectra.js: Local vector search

    ↓ User writes entry

IndexedDB.entries.add(encrypted) → Instant save (local only)

    ↓ NO SERVER CALLS

WebLLM.analyze(entry) → On-device inference
    ├─ Extract topics (in-browser)
    ├─ Detect patterns (local ML model)
    └─ Search local memory graph (IndexedDB + Vectra)

    ↓

IndexedDB.analysis.add(result) → Store insights locally

    ↓

UI displays insights (zero latency, zero server communication)

**Marketing:** "Your data never leaves your device."
```

---

## Rationale

### Why This Hybrid Approach?

1. **Ship Fast (Phase 1)**
   - Firestore + Cloud AI = proven stack
   - Validate product-market fit in 3 months
   - Don't wait 6 months for on-device AI

2. **Cost Efficient**
   - Supabase free tier: $0 for beta (vs Cloud SQL $40/mo)
   - Year 1 savings: $480 (Supabase) vs Cloud SQL
   - On-device AI users: Zero marginal cost (no API calls)

3. **Privacy-First Positioning**
   - Phase 1: "Encrypted at rest and in transit"
   - Phase 2: "Your data never leaves your device" (competitive moat)
   - Freemium model: Free (cloud) → Privacy ($19/mo, on-device)

4. **Technical Flexibility**
   - Local-first by default (IndexedDB always)
   - Cloud sync optional (Firestore if user wants multi-device)
   - AI processing adaptive (cloud or on-device based on user preference)

5. **Future-Proof**
   - WebGPU + WebLLM = on-device AI is viable today
   - Progressive enhancement (add Privacy Mode without breaking existing)
   - Easy migration path (PostgreSQL standard, not vendor-specific)

### Why NOT Cloud SQL?

- **Cost:** $40/mo minimum vs Supabase $0 free tier
- **Idle waste:** Paying for capacity with 0 users
- **Setup complexity:** VPC config, IAM roles, Cloud SQL Proxy
- **No dashboard:** Raw psql vs Supabase SQL editor

**When to reconsider:** If we go all-in on Google Cloud (Cloud Run, Cloud Storage, etc.) and want unified billing/IAM. But at 0 users, Supabase's free tier wins.

### Why NOT Skip Firestore?

- **Offline-first UX:** Could build with IndexedDB + Background Sync API, but Firestore handles this out-of-the-box
- **Multi-device sync:** Users will want entries synced across phone + laptop
- **Real-time updates:** Firestore listeners provide instant UI updates
- **Negligible cost:** ~$0.60/mo for 100 users × 10 entries/mo

**Trade-off:** Adding Firestore adds complexity, but the DX benefits (offline-first, real-time sync) outweigh the cost at our scale.

---

## Consequences

### Positive

✅ **Zero cost until product validation** (Supabase free tier)
✅ **Offline-first UX** (IndexedDB + Firestore local cache)
✅ **Privacy Mode enables premium tier** (on-device AI = $0 server costs)
✅ **MIRA gets PostgreSQL features** it expects (vector search, full-text, RLS)
✅ **Easy migration** if needed (standard PostgreSQL, not proprietary)
✅ **Better DX** (Supabase dashboard vs raw Cloud SQL)

### Negative

⚠️ **Three storage layers** (IndexedDB, Firestore, Supabase) = more moving parts
⚠️ **Firestore cost scales** with usage (but negligible: $10/mo at 1,000 users)
⚠️ **Cross-cloud latency** (Cloud Run → Supabase) vs Google-internal networking
⚠️ **On-device AI requires WebGPU** (not all browsers yet, ~80% coverage in 2026)

### Risks & Mitigations

**Risk:** Supabase free tier limit (500MB) exceeded during beta
**Mitigation:** Monitor usage, upgrade to Pro ($25/mo) if needed. 500MB = ~5,000 entries, more than enough for 20 beta users.

**Risk:** On-device AI fails on low-end devices
**Mitigation:** Progressive enhancement. Cloud AI is fallback. Detect WebGPU support before enabling Privacy Mode.

**Risk:** Firestore costs explode at scale
**Mitigation:** Privacy Mode users skip Firestore entirely. Free tier users generate minimal operations. Pro tier users ($25/mo) cover Firestore costs easily.

---

## Migration Path

### Phase 1: MVP (Now)
- **Ship:** Firestore + Cloud AI + Supabase
- **Cost:** $0 (free tiers) until 20 beta users
- **Timeline:** 3 months to validate PMF

### Phase 2: Add Privacy Mode (Months 4-6)
- **Ship:** On-device AI option (WebLLM + IndexedDB)
- **Cost:** Still $0 for on-device users, $25/mo Supabase Pro if cloud users exceed 500MB
- **Marketing:** "Your data never leaves your device" (new premium tier)

### Phase 3: Optimize (Months 7-12)
- **Optimize:** Model quantization (reduce from 3.8B → 1B params)
- **Add:** Local vector search (Vectra.js), embeddings (Transformers.js)
- **Cost:** Decreases as more users adopt Privacy Mode (zero server costs)

### Phase 4: Scale (Year 2)
- **Decision point:** Reevaluate at 10k+ users
  - **Option A:** Stay with Supabase (linear scaling, $25-100/mo)
  - **Option B:** Migrate to Cloud SQL if all-in on Google Cloud
  - **Option C:** Self-host PostgreSQL if DevOps resources available

---

## Implementation Notes

### Firestore Configuration

```typescript
// apps/web/src/lib/services/firestore.ts
import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Enable offline persistence (local cache)
await enableIndexedDbPersistence(db)

// Optional: User can disable cloud sync
const cloudSyncEnabled = userPreferences.cloudSync ?? true
```

### Supabase Configuration

```bash
# MIRA .env configuration
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Row-Level Security (enable after MIRA creates tables)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own memories"
  ON memories FOR ALL
  USING (user_id = current_setting('app.user_id', true));
```

### On-Device AI (Phase 2)

```typescript
// apps/web/src/lib/ai/on-device.ts
import { CreateMLCEngine } from '@mlc-ai/web-llm'

// Check WebGPU support
async function canUseOnDevice(): Promise<boolean> {
  return 'gpu' in navigator
}

// Initialize on-device model
const engine = await CreateMLCEngine('Phi-3-mini-4k-instruct')

// Analyze locally
const analysis = await engine.chat.completions.create({
  messages: [{
    role: 'system',
    content: 'Extract topics and patterns from this journal entry...'
  }, {
    role: 'user',
    content: decryptedEntry
  }]
})
```

---

## References

- [Supabase Pricing](https://supabase.com/pricing) - Free tier details
- [WebLLM Documentation](https://webllm.mlc.ai/) - On-device inference
- [MIRA-OSS Tools Guide](../../mira-OSS/tools/HOW_TO_BUILD_A_TOOL.md) - User-scoped architecture
- [ADR-001 MIRA-OSS Integration](001-mira-oss-integration.md) - Sidecar approach

---

## Alternatives Considered

### Alternative 1: Cloud SQL Instead of Supabase

**Rejected because:**
- $40/mo minimum vs $0 free tier
- Paying for idle capacity at 0 users
- More complex setup (VPC, IAM, Cloud SQL Proxy)
- No built-in dashboard (raw psql only)

**When to reconsider:** If we scale to 10k+ users and go all-in on Google Cloud ecosystem.

### Alternative 2: Skip Firestore, Use Only IndexedDB

**Rejected because:**
- Lose multi-device sync (users want entries on phone + laptop)
- Lose real-time updates (Firestore listeners)
- Would need to build Background Sync API + conflict resolution ourselves
- Firestore cost negligible ($10/mo at 1,000 users)

**When to reconsider:** If on-device AI becomes primary mode and users don't want multi-device sync.

### Alternative 3: PostgreSQL Only (No Firestore)

**Rejected because:**
- Lose offline-first UX (PostgreSQL requires server connection)
- Lose real-time sync (would need custom WebSocket layer)
- Entry saves feel slow (network roundtrip vs instant IndexedDB)

**When to reconsider:** Never. Offline-first is core to product experience.

---

## Success Metrics

**Phase 1 (Beta):**
- [ ] 20 users onboarded with Firestore sync working
- [ ] Supabase free tier sufficient (< 500MB used)
- [ ] Zero Firestore cost overruns (< $10/mo)
- [ ] MIRA integration working with user isolation

**Phase 2 (Privacy Mode):**
- [ ] On-device AI working on 80%+ of user devices
- [ ] Privacy Mode users = 0 server costs (no API calls)
- [ ] Marketing differentiator: "Data never leaves device"
- [ ] Conversion rate: 20%+ of free users upgrade to Privacy tier

**Phase 3 (Scale):**
- [ ] 1,000 users supported on $25-50/mo infrastructure
- [ ] On-device users = 50%+ (reducing server load)
- [ ] Supabase costs < $100/mo at 10k users
