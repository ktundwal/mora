# Getting Started with Mora Development

**Last Updated:** January 2026

Welcome! This guide helps you understand the Mora project and start contributing effectively.

---

## What is Mora?

**Mora is your AI thought partner for high-stakes moments in work, relationships, and life.**

We help people:
- Pause before reacting in triggering moments
- See their defensive patterns over time
- Make better decisions with memory of past choices
- Build collaborative playbooks that persist forever

**Powered by MIRA-OSS**, a sophisticated memory engine with activity-based decay and self-evolving knowledge graphs.

---

## Project Context

### Where We Are Now (January 2026)

**Current Phase:** Foundation (Months 1-3)
- Deploying MIRA-OSS as memory engine
- Building journal entry UI (topic-centric, not person-centric)
- Implementing MIRA integration bridge
- Launching to 20 beta users

**Previous Context:**
- Started as "relationship conflict resolution tool"
- Pivoted to broader "thought partner" positioning (work + life + relationships)
- Decided to integrate MIRA-OSS for persistent memory (vs building from scratch)

**Key Decisions:**
- [MIRA-OSS Integration Strategy](decisions/001-mira-oss-integration.md) — Use MIRA as sidecar service
- [Product Positioning](decisions/002-product-positioning.md) — Broad "thought partner" vs relationship-only

---

## Essential Reading (15 minutes)

### Must-Read (in order)

1. **[VISION.md](design/VISION.md)** — Product vision, strategy, business model (10 min read)
   - Understand the problem we're solving
   - Target users (knowledge workers, therapy clients, managers)
   - 4-phase roadmap (18 months to $50k MRR)

2. **[ARCHITECTURE.md](design/ARCHITECTURE.md)** — Technical architecture (5 min skim)
   - Frontend: Next.js, React, Tailwind
   - Backend: Firebase Functions → MIRA-OSS → PostgreSQL
   - Data flow: Journal entry → AI analysis → Memory extraction

3. **[docs/WORKFLOW.md](WORKFLOW.md)** — bd workflow guide (5 min read)
   - How we track work with bd (beads issue tracker)
   - How to pick up an issue and ship it

---

## Quick Architecture Overview

```
User writes journal entry (browser)
    ↓
Next.js Frontend (Vercel)
    ↓
Firebase Cloud Function "analyzeEntry"
    ├─ Validates auth + quota
    ├─ Decrypts content (if E2E encrypted)
    └─ Calls MIRA-OSS /chat endpoint
            ↓
    MIRA-OSS Service (Cloud Run)
        ├─ Extracts entities (people, topics, themes)
        ├─ Links to existing memories
        ├─ Surfaces related past entries
        └─ Returns: AI analysis + topics + memories
    ↓
Firebase Function syncs metadata to Firestore
    ↓
Frontend displays analysis with surfaced memories
```

**Key Insight:** Firestore holds UI metadata (fast listing), PostgreSQL (via MIRA) holds full memory graph.

---

## Development Workflow

### 1. Pick an Issue

Find available work with `bd`:

```bash
bd ready                      # Show issues ready to work on
bd show mora-ddy              # View details of a specific issue
```

### 2. Check Implementation Guidance

Look for technical notes in `docs/implementation/`:

```bash
cat docs/implementation/01-foundation/01-mira-deployment.md
```

### 3. Claim It

```bash
bd update mora-ddy --status in_progress
```

### 4. Create Branch

```bash
git checkout -b feature/mora-ddy-mira-deployment
```

### 5. Implement

Follow the implementation guide and issue acceptance criteria

### 6. Verify Before Pushing

```bash
npm run verify
# Runs: lint + typecheck + build + test
```

If this passes, you're good to push.

### 7. Close Issue and Push

```bash
bd close mora-ddy
git push origin feature/mora-ddy-mira-deployment
```

Create PR to `main` with issue ID in title:
- `[mora-ddy] Deploy MIRA-OSS to Cloud Run`

### 8. Ship

After PR approval, merge triggers auto-deploy to Vercel.

---

## Key Concepts

### Topic-Centric UX (NEW)

**Before:**
```
Home → People List → Choose Person → Add Entry
```
User picks person first (friction).

**After:**
```
Home → Write Anything → AI Extracts Topics
```
User just writes, topics emerge organically.

**Why:** Broader appeal, less friction, aligns with "thought partner" positioning.

### MIRA Memory Engine

**MIRA-OSS** is a Python FastAPI service that provides:
- **Activity-based decay:** Memories degrade based on engagement, not calendar time (vacation-proof)
- **Entity extraction:** Auto-detects people, topics, themes from text
- **Knowledge graph:** Links memories with typed relationships (supersedes, conflicts, caused_by)
- **Domaindocs:** Persistent, non-decaying knowledge blocks (collaborative self-model)
- **Proactive memory:** Surfaces relevant past entries based on current context

**Located:** `mira-OSS/` directory (external project, do not modify)

### End-to-End Encryption (E2EE)

- **Client-side:** AES-256-GCM via Web Crypto API
- **Zero-knowledge:** Server cannot decrypt user data
- **Key storage:** IndexedDB (per device), optional passphrase encryption
- **Recovery:** 24-word BIP39 phrase for multi-device access

**Implication:** Firestore stores encrypted envelopes, Firebase Function decrypts before sending to MIRA.

### bd (Issue Tracking)

We use **bd** (beads) for issue tracking - a git-native CLI tool perfect for AI workflows:
- Issues tracked in `.beads/issues.jsonl` (syncs with git)
- Commands: `bd ready`, `bd show <id>`, `bd update <id> --status in_progress`, `bd close <id>`
- Supports dependencies: `bd dep add <issue> <depends-on>`
- Status: `open` | `in_progress` | `blocked` | `done`
- Priority: `0` (critical) | `1` (high) | `2` (medium) | `3` (low) | `4` (backlog)

---

## Common Questions

### Q: What's the difference between Firestore and PostgreSQL?

**Firestore:**
- UI metadata (topics, entry previews, timestamps)
- Fast listing/filtering for frontend
- Client-side encrypted data

**PostgreSQL (MIRA):**
- Full conversation history
- Memory graph with entity links
- AI-generated insights
- Plaintext (processed by MIRA)

**Sync:** Firebase Function writes to both. Firestore is "cache," PostgreSQL is "source of truth" for memory.

### Q: Why are we using MIRA-OSS instead of building our own memory system?

**Decision:** [001-mira-oss-integration.md](decisions/001-mira-oss-integration.md)

**Short answer:** MIRA-OSS solves hard problems (activity-based decay, entity linking, domaindocs) that would take 3-6 months to build. Using it as a sidecar service gives us full power without forking/customization burden.

### Q: What's the business model?

**Freemium SaaS:**
- **Free:** 10 entries/month, 30-day history
- **Plus:** $12/mo, unlimited entries, pattern insights
- **Pro:** $25/mo, full history, domaindocs, advisor sharing

**TAM:** $647M/year (US knowledge workers + therapy clients + enterprise managers)

### Q: When do we ship to users?

**Phase 1 (Months 1-3):** 20 beta users (friends/family)
- Ship when: 10 users say "This saved a conversation"

**Phase 2 (Months 4-6):** 100 active users
- Product Hunt launch, Reddit organic

**Phase 3 (Months 7-9):** 500 users, $5k MRR
- Content marketing, therapist partnerships

**Phase 4 (Months 10-12):** 1,000 users, $10k MRR
- Enterprise pilots, B2B2C expansion

---

## Things You Should NOT Do

### ❌ Don't Modify mira-OSS Directory

The `mira-OSS/` directory is synced from an external repository. All customization happens in Firebase Functions bridge layer, not MIRA itself.

### ❌ Don't Skip `npm run verify`

Always run before pushing. Catches lint, type errors, broken tests.

### ❌ Don't Create New Top-Level Docs Without Asking

Documentation lives in structured locations:
- **Design docs:** `docs/design/`
- **Decisions (ADRs):** `docs/decisions/`
- **Implementation guides:** `docs/implementation/`
- **Work tracking:** `.beads/` (bd database, auto-managed)

If you want to add docs, propose location first.

### ❌ Don't Commit Secrets

Never commit:
- API keys
- `.env.local` files
- Firebase config (use `.env.example` as template)

---

## Getting Help

### Documentation

1. **[VISION.md](design/VISION.md)** — Product questions
2. **[ARCHITECTURE.md](design/ARCHITECTURE.md)** — Technical questions
3. **[Decisions](decisions/)** — Why we made specific choices
4. **[CLAUDE.md](../CLAUDE.md)** — Claude Code development guidelines

### Code References

- **Existing onboarding flow:** `apps/web/src/app/onboarding/`
- **Stores (state management):** `apps/web/src/lib/stores/`
- **Services (API clients):** `apps/web/src/lib/services/`
- **Encryption utilities:** `apps/web/src/lib/crypto/`
- **Cloud Functions:** `apps/functions/src/index.ts`

### Ask Questions

If stuck:
1. Check `docs/implementation/` for technical guidance
2. Read related decision docs (ADRs in `docs/decisions/`)
3. Look at existing similar code
4. Check issue description: `bd show <id>`

---

## Next Steps

1. **Read VISION.md** — Understand where we're going
2. **Read ARCHITECTURE.md** — Understand how it works
3. **Run `bd ready`** — See what's available to work on
4. **Pick an issue** — Claim it, implement it, ship it

**Welcome to Mora!** 🚀
