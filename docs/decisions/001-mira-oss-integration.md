# Decision: MIRA-OSS Integration Strategy

**Date:** January 2026
**Status:** Approved
**Deciders:** Kapil
**Related:** SPEC-006-mira-oss-integration.spec.md

---

## Context

Mora needs a sophisticated memory engine to deliver on "AI thought partner" positioning. MIRA-OSS provides:
- Persistent, activity-based memory with decay
- Entity extraction and knowledge graph
- Domaindocs (permanent self-model knowledge)
- Proactive memory surfacing

Three integration options were evaluated:
1. **Sidecar Service** — MIRA as separate service, Firebase as frontend
2. **Full Migration** — Move all data to PostgreSQL, MIRA as primary backend
3. **Build Memory Layer** — Port MIRA concepts to TypeScript/Firestore

---

## Decision

**Use Option 1: MIRA as Sidecar Service**

Architecture:
```
Mora Frontend (Next.js/Vercel)
    ↓
Firebase Cloud Functions (auth, billing, rate limiting)
    ↓
MIRA-OSS Service (Cloud Run/Fly.io)
    ↓
PostgreSQL + Valkey (MIRA's stack)
```

---

## Rationale

### Why Sidecar Wins

1. **Minimal MIRA Changes**
   - Use MIRA-OSS as-is (no fork, no customization)
   - Constraint: "Minimal updates to mira-oss directory" is respected
   - Easier to pull upstream updates if MIRA evolves

2. **Separation of Concerns**
   - Firebase handles: Auth, billing, fast UI listing
   - MIRA handles: Memory, AI reasoning, entity graph
   - Each component does what it's best at

3. **Gradual Adoption**
   - Start with journal entries → MIRA
   - Existing conversation/unpack features can stay Firebase-native initially
   - Low-risk rollout

4. **Easy Rollback**
   - If MIRA doesn't work out, Cloud Function can fall back to direct OpenAI/Anthropic calls
   - No data migration required to revert

5. **Development Speed**
   - Fastest path to working integration (8-12 days vs 14-19 days)
   - Can iterate on UX while MIRA runs as black box

### Why Not Full Migration (Option 2)

- ❌ Requires migrating all existing Mora data to PostgreSQL
- ❌ Lose Firestore benefits (real-time listeners, offline, Firebase ecosystem)
- ❌ Higher operational complexity (PostgreSQL + Valkey running 24/7)
- ❌ Risk of MIRA fork diverging from upstream

### Why Not Build Memory Layer (Option 3)

- ❌ Significant development effort (porting memory logic to TypeScript)
- ❌ Reinventing wheel (MIRA already solved these problems)
- ❌ Missing MIRA features (working memory trinkets, full entity graph)
- ❌ Ongoing maintenance burden (we become memory system maintainers)

---

## Implementation Plan

### Week 1: MIRA Deployment
- Deploy MIRA-OSS to Cloud Run (or Fly.io)
- Configure PostgreSQL (Cloud SQL or Neon)
- Configure Valkey (Upstash or Redis Cloud)
- Set up secrets (Anthropic API key, MIRA service key)

### Week 2: Firebase Bridge
- Create `analyzeEntry` Cloud Function
- Implement Firebase UID → MIRA user ID mapping
- Build MIRA API client (POST /chat, GET /data/memories)
- Decrypt content in function, call MIRA, re-encrypt response

### Week 3: Data Sync
- Create Firestore collections: `journal_entries`, `threads`, `patterns`
- Sync MIRA entities → Firestore threads
- Sync MIRA memories → Firestore patterns
- Keep full data in PostgreSQL, metadata in Firestore for UI

### Week 4: Frontend Integration
- Build "New Journal Entry" UI
- Display analysis with surfaced memories
- Show related threads/topics
- Link to MIRA memories in PostgreSQL

---

## Consequences

### Positive

- **Fast time to market:** Working integration in 4 weeks
- **Full MIRA power:** Get all memory features without reimplementing
- **Low risk:** Easy to roll back if needed
- **Maintainability:** MIRA updates don't require Mora code changes

### Negative

- **Two databases:** Complexity in keeping Firestore ↔ PostgreSQL in sync
- **Operational overhead:** Must deploy and monitor MIRA service separately
- **Latency:** Extra hop (Function → MIRA) adds ~50-100ms
- **Cost:** Additional infrastructure (PostgreSQL, Valkey, Cloud Run)

### Mitigations

**Database Sync:**
- Firestore is "cache" — always treat PostgreSQL as source of truth
- Rebuild Firestore from PostgreSQL if desync occurs

**Operational Overhead:**
- Use managed services (Cloud Run auto-scales, Cloud SQL managed)
- Set up monitoring/alerting (Sentry, Cloud Monitoring)

**Latency:**
- Optimize MIRA response time (cache frequent queries in Valkey)
- Use streaming responses (show analysis as it generates)

**Cost:**
- Start with smallest instance sizes
- Scale up only when user volume justifies
- Monitor cost per user, optimize prompt engineering

---

## Open Questions

1. **Encryption:** How to handle E2E encryption with MIRA?
   - **Decision:** Decrypt in Cloud Function (secure context), send plaintext to MIRA
   - Keys never logged, never sent to MIRA's storage
   - MIRA processes plaintext, function re-encrypts before Firestore write

2. **Existing Data:** Migrate existing conversations/unpacks to MIRA?
   - **Decision:** Start fresh for journal entries, keep existing data in Firestore
   - Later: optional migration job if users want full history in MIRA

3. **Billing Integration:** Does MIRA processing count against unpack limits?
   - **Decision:** Separate quota — journal entries unlimited, Unpacks metered
   - Aligns with pricing: Plus tier = unlimited journal, Pro tier = unlimited Unpacks

4. **Offline Support:** How to handle offline journal entries?
   - **Decision:** Queue in localStorage, sync when online (Phase 2 feature)

---

## Alternatives Considered

### Alternative 1: MIRA-Lite (Minimal Port)

Port only essential MIRA features to TypeScript:
- Memory extraction
- Basic decay model
- Entity linking (simplified)

**Why Rejected:**
- Still significant development (2-3 weeks)
- Miss out on Domaindocs, trinkets, full graph
- Ongoing maintenance burden

### Alternative 2: Hybrid (Firestore + MIRA)

Use Firestore for recent data (< 90 days), MIRA for long-term memory:
- Recent entries in Firestore (fast, real-time)
- Old entries migrate to MIRA (compressed, decay-based)

**Why Rejected:**
- Complex data lifecycle management
- User experience suffers (split history)
- Not clear when to migrate (90 days arbitrary)

---

## Future Decisions

### When to Revisit This Decision

**Triggers for reconsideration:**
1. MIRA service becomes operational burden (frequent outages, scaling issues)
2. Database sync bugs cause user-facing issues repeatedly
3. Latency exceeds 2s (bad UX)
4. Cost per user exceeds $5/mo (margin compression)

**Potential pivot:**
- If MIRA doesn't work out → Build memory layer (Option 3)
- If Firestore becomes bottleneck → Full migration (Option 2)

---

## References

- [SPEC-006: MIRA-OSS Integration](../specs/SPEC-006-mira-oss-integration.spec.md)
- [MIRA-OSS Documentation](../../mira-OSS/docs/)
- [ARCHITECTURE.md](../design/ARCHITECTURE.md)
