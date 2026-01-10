# SPEC-006: MIRA-OSS Integration for Mora AI Backend

**Created:** December 22, 2025  
**Status:** Draft  
**Owner:** Kapil

---

## Executive Summary

This spec evaluates three options for integrating MIRA-OSS as Mora's AI backend. MIRA-OSS provides sophisticated memory extraction, decay-based recall, self-evolving domaindocs, and conversational context management that could significantly enhance Mora's AI capabilities while enabling a potential UX pivot from "people threads" to "topics" for broader market appeal.

**Key Discovery:** MIRA has TWO memory systems, not one:
1. **LT_Memory** (PostgreSQL): Decaying facts extracted from conversations
2. **Domaindocs** (per-user SQLite): Permanent, AI+human-editable knowledge blocks

The Domaindocs system is particularly valuable for Mora — it's where MIRA builds a persistent "self-model" that tracks behavioral patterns and learns what works. This directly aligns with Mora's "Fear of Hurting" philosophy.

---

## Background

### Current Mora Architecture
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind v4
- **Backend:** Firebase Cloud Functions (2nd Gen) → AI providers (OpenAI/Anthropic via Genkit)
- **Database:** Firestore (NoSQL) with user-owned documents
- **Core Flow:** Paste conversation → Generate Unpack → Draft reply
- **UX Model:** Distinct "People" threads (person-centric compartmentalization)

### MIRA-OSS Architecture
- **API Server:** FastAPI (Python) with streaming support
- **Database:** PostgreSQL + pgvector (vector embeddings for semantic search)
- **Per-User Storage:** SQLite at `data/users/{user_id}/userdata.db` for domaindocs
- **Memory System:** Discrete memory objects with decay-based scoring (activity-based, not calendar-based)
- **Key Components:**
  - **CNS (Continuum Namespace):** Immutable conversation management
  - **Working Memory:** Trinket-based dynamic system prompt composition
  - **LT_Memory:** Long-term memory with extraction, linking, and refinement
  - **Domaindocs:** Persistent, non-decaying knowledge blocks (see below)
- **UX Model:** Single unified continuum (all topics in one stream)

### Domaindocs: The "Self-Model" System (Critical Discovery)

**What you saw on miraos.org is a Domaindoc** — specifically the `personal_context` domaindoc. This is a **separate system from LT_Memory** with a fundamentally different purpose:

| Aspect | LT_Memory (Memories) | Domaindocs |
|--------|---------------------|------------|
| **Storage** | PostgreSQL (shared) | Per-user SQLite |
| **Decay** | Yes (activity-based) | **No (permanent)** |
| **Structure** | Flat text with entity links | Hierarchical sections/subsections |
| **Primary Editor** | MIRA extracts automatically | **Both MIRA and user edit** |
| **Purpose** | Facts from conversations | Stable knowledge, self-insights |

**Key Insight:** The `personal_context` you saw is MIRA's **self-model scratchpad** where it:
1. Tracks its own behavioral patterns ("Agreement bias", "Helpfulness pressure")
2. Records what works/doesn't work in conversations
3. Builds a persistent identity that doesn't decay

**This is powerful for Mora because:**
- MIRA can learn YOUR communication patterns over time
- It can track what drafting approaches work for you
- It builds a relationship "playbook" that persists forever
- User can also edit it (collaborative knowledge)

**Example Domaindocs for Mora:**
- `personal_context`: User's self-insights, communication style, triggers
- `relationship_patterns`: What works with Partner, Manager, Friend
- `playbook`: Repair scripts, boundary templates (replaces Mora's current Playbook feature)

### Key MIRA-OSS Capabilities for Mora
1. **Memory Extraction (LT_Memory):** Extracts discrete facts from conversations with importance scoring
2. **Entity Linking:** Builds knowledge graph relationships between concepts
3. **Semantic Search:** Vector-based recall of relevant context
4. **Decay Model:** Activity-based (vacation-proof) memory decay
5. **Proactive Memory:** Surfaces relevant memories based on conversation context
6. **Domaindocs (NEW!):** Persistent, user+AI-editable knowledge blocks for:
   - Personal communication style
   - Relationship-specific playbooks
   - Self-model and behavioral insights
   - Stable reference material (doesn't decay)

---

## UX Evolution: From "People" to "Topics"

### Current State (People-Centric)
```
User → People List → Person Thread → Conversations
```
Users compartmentalize by relationship (Partner, Manager, Friend).

### Potential State (Topic-Centric)
```
User → Journal Entry (free-form) → Auto-categorized into Topics
       ↓
   Topics emerge from content:
   - "Work tension with Sarah"
   - "Boundary issues with Mom"
   - "Career anxiety"
   - "Relationship repair with Alex"
```

### Why This Matters
- **Broader Appeal:** Not just relationships—work stress, self-reflection, life decisions
- **Reduced Friction:** "Add a random journal entry" vs. "Choose a person first"
- **MIRA Alignment:** MIRA's entity extraction naturally discovers topics/people/themes
- **Memory Continuity:** Related entries link automatically through entity graph

---

## Option 1: MIRA as Sidecar Service (Recommended)

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         Mora Frontend                            │
│                    (Next.js on Vercel)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase Cloud Functions                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Mora Functions (Node.js)                                │    │
│  │  - Auth validation                                       │    │
│  │  - Rate limiting                                         │    │
│  │  - Firestore sync (user profiles, encryption)            │    │
│  │  - Stripe billing                                        │    │
│  └───────────────────────┬─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                          │ Internal HTTP
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MIRA-OSS Service                              │
│                  (Cloud Run / Fly.io)                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  FastAPI (Python)                                        │    │
│  │  - /chat (streaming conversation)                        │    │
│  │  - /data/memories (memory retrieval)                     │    │
│  │  - /data/history (conversation history)                  │    │
│  │  - Memory extraction (batch processing)                  │    │
│  └───────────────────────┬─────────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     PostgreSQL       Valkey/Redis      Vault
     + pgvector       (Cache)           (Secrets)
```

### Data Flow
1. **User submits journal entry** → Mora Frontend
2. **Frontend calls** → Firebase Function `processEntry`
3. **Function validates auth, checks quota** → Calls MIRA `/chat` with entry text
4. **MIRA processes:**
   - Extracts entities (people, topics, emotions)
   - Links to existing memories
   - Generates response/analysis
   - Stores memories in PostgreSQL
5. **Function receives response** → Syncs key metadata to Firestore (for search/list)
6. **Frontend displays** → Streaming response, topic suggestions

### Implementation Details

#### A. MIRA Service Deployment
```yaml
# Cloud Run service definition (no changes to mira-oss code)
service: mora-mira
runtime: python3.11
instance_class: F4
env_variables:
  MIRA_SINGLE_USER_MODE: "false"  # Multi-user mode
  POSTGRES_HOST: "..."
  VALKEY_HOST: "..."
```

#### B. Firebase Function Bridge
```typescript
// apps/functions/src/mira-bridge.ts
export const processEntry = onCall<ProcessEntryRequest>({
  secrets: [miraApiKey],
}, async (request) => {
  const { text, entryType } = request.data;
  const uid = request.auth!.uid;
  
  // 1. Get or create MIRA user mapping
  const miraUserId = await ensureMiraUser(uid);
  
  // 2. Call MIRA chat endpoint
  const response = await fetch(`${MIRA_URL}/chat`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${miraApiKey.value()}`,
      'X-Mora-User-Id': miraUserId,
    },
    body: JSON.stringify({
      message: text,
      metadata: { source: 'mora', entryType }
    })
  });
  
  // 3. Extract topics from MIRA response
  const data = await response.json();
  const topics = extractTopicsFromResponse(data);
  
  // 4. Sync to Firestore for UI listing
  await syncEntryToFirestore(uid, text, topics, data.memories);
  
  return { analysis: data.content, topics, memories: data.surfaced_memories };
});
```

#### C. Firestore Sync Model
```typescript
// Minimal Firestore sync for UI/search (full data in PostgreSQL)
interface JournalEntry {
  id: string;
  uid: string;
  preview: string;          // First 100 chars (plaintext for search)
  topics: string[];         // Auto-extracted: ["work", "Sarah", "boundary"]
  miraMessageId: string;    // Link to MIRA PostgreSQL
  createdAt: Timestamp;
  schemaVersion: number;
}

interface Topic {
  id: string;
  uid: string;
  name: string;             // "Work tension with Sarah"
  entityType: string;       // "person" | "theme" | "situation"
  entryCount: number;
  lastEntryAt: Timestamp;
  miraEntityId: string;     // Link to MIRA entity
}
```

### Pros
- ✅ **Minimal MIRA changes:** Use as-is, only configure for multi-user
- ✅ **Best of both worlds:** Firestore for fast UI listing, PostgreSQL for AI memory
- ✅ **Gradual migration:** Keep existing Mora features, add MIRA capabilities
- ✅ **Separation of concerns:** Billing/auth in Firebase, AI in MIRA
- ✅ **Cost efficient:** MIRA only runs when processing entries

### Cons
- ❌ **Two databases:** Complexity in keeping Firestore ↔ PostgreSQL in sync
- ❌ **Operational overhead:** Must deploy and monitor MIRA service separately
- ❌ **Latency:** Extra hop from Function → MIRA adds ~50-100ms

### Effort Estimate
- MIRA deployment setup: 1-2 days
- Firebase Function bridge: 2-3 days
- Topic extraction logic: 2-3 days
- UI updates for topics: 3-4 days
- **Total: 8-12 days**

---

## Option 2: Full Migration to MIRA Backend

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         Mora Frontend                            │
│                    (Next.js on Vercel)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS (direct)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MIRA-OSS (Extended)                           │
│                  (Cloud Run / Dedicated VM)                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  FastAPI + Mora Extensions                               │    │
│  │  - Firebase Auth verification                            │    │
│  │  - Stripe webhook handlers                               │    │
│  │  - Mora-specific API routes                              │    │
│  │    - POST /mora/entry                                    │    │
│  │    - GET /mora/topics                                    │    │
│  │    - POST /mora/unpack                                   │    │
│  │    - POST /mora/draft                                    │    │
│  └───────────────────────┬─────────────────────────────────┘    │
└──────────────────────────┼──────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
     PostgreSQL       Valkey/Redis      Firebase
     (All data)       (Cache)           (Auth only)
```

### Implementation Details

#### A. MIRA Extension Module (lives outside mira-oss directory)
```python
# apps/mora-backend/mora_routes.py
# This is a NEW module that imports mira-oss, not modifying it

from fastapi import APIRouter, Depends
from mira_oss.cns.services.orchestrator import get_orchestrator
from mira_oss.lt_memory.extraction import ExtractionService

router = APIRouter(prefix="/mora")

@router.post("/entry")
async def process_entry(
    request: MoraEntryRequest,
    user: MoraUser = Depends(verify_firebase_token)
):
    """Process a journal entry with MIRA's full memory system."""
    # Use MIRA's orchestrator with Mora-specific system prompt
    orchestrator = get_orchestrator()
    
    # Custom Mora system prompt for entry analysis
    response = await orchestrator.process_message(
        user_id=user.mira_id,
        message=request.text,
        system_prompt_override=MORA_ENTRY_SYSTEM_PROMPT
    )
    
    # Extract topics from MIRA's entity detection
    topics = await extract_mora_topics(user.mira_id, response)
    
    return MoraEntryResponse(
        analysis=response.content,
        topics=topics,
        memories=response.surfaced_memories
    )
```

#### B. User Migration
```python
# Migrate Firestore users to PostgreSQL
async def migrate_user(firebase_uid: str) -> str:
    """Create MIRA user linked to Firebase Auth."""
    # Check if already migrated
    existing = await db.execute(
        "SELECT id FROM users WHERE firebase_uid = $1",
        firebase_uid
    )
    if existing:
        return existing.id
    
    # Create new MIRA user
    mira_user_id = str(uuid.uuid4())
    await db.execute("""
        INSERT INTO users (id, email, firebase_uid, is_active)
        VALUES ($1, $2, $3, true)
    """, mira_user_id, email, firebase_uid)
    
    return mira_user_id
```

### Pros
- ✅ **Single source of truth:** All data in PostgreSQL
- ✅ **Full MIRA power:** Native access to all memory features
- ✅ **Simpler architecture:** No sync between databases
- ✅ **Better performance:** Direct database access, no function hop

### Cons
- ❌ **Major migration:** Must move all existing Mora data to PostgreSQL
- ❌ **Lose Firestore benefits:** Real-time listeners, offline support, Firebase hosting
- ❌ **Billing complexity:** Must implement Stripe in Python (or keep Firebase Function)
- ❌ **MIRA fork risk:** Any Mora-specific changes might conflict with upstream updates
- ❌ **Higher infra cost:** PostgreSQL + Valkey running 24/7

### Effort Estimate
- User migration system: 2-3 days
- MIRA extension module: 3-4 days
- Data migration scripts: 3-4 days
- Frontend API refactor: 4-5 days
- Billing integration: 2-3 days
- **Total: 14-19 days**

---

## Option 3: MIRA-Inspired Memory Layer (Build, Don't Integrate)

### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         Mora Frontend                            │
│                    (Next.js on Vercel)                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase Cloud Functions                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Mora Functions (Node.js) + Memory Layer                 │    │
│  │  - Memory extraction (port from MIRA)                    │    │
│  │  - Entity linking (simplified)                           │    │
│  │  - Vector search (Firestore Vector or Pinecone)          │    │
│  └───────────────────────┬─────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
                    Firestore + 
                    Firestore Vector Search
                    (All data)
```

### Implementation Details

#### A. Port Memory Extraction Logic
```typescript
// apps/functions/src/memory/extraction.ts
// Inspired by mira-oss/lt_memory/extraction.py

interface ExtractedMemory {
  text: string;
  importanceScore: number;
  entities: string[];
  expiresAt?: Date;
  happensAt?: Date;
}

async function extractMemories(
  conversationText: string,
  existingMemories: Memory[]
): Promise<ExtractedMemory[]> {
  const prompt = buildExtractionPrompt(conversationText, existingMemories);
  
  const response = await ai.generate({
    model: gemini15Flash,
    prompt,
    output: { schema: MemoryExtractionSchema }
  });
  
  // Deduplicate against existing
  return deduplicateMemories(response.output, existingMemories);
}
```

#### B. Simplified Decay Model
```typescript
// apps/functions/src/memory/scoring.ts
// Port key concepts from mira-oss/lt_memory/scoring_formula.sql

function calculateImportanceScore(memory: Memory, user: User): number {
  const activityDaysSinceLastAccess = 
    user.cumulativeActivityDays - memory.activityDaysAtLastAccess;
  
  // Momentum decay: 5% per inactive day
  const effectiveAccessCount = 
    memory.accessCount * Math.pow(0.95, activityDaysSinceLastAccess);
  
  const activityDaysSinceCreation = 
    user.cumulativeActivityDays - memory.activityDaysAtCreation;
  
  const accessRate = effectiveAccessCount / Math.max(7, activityDaysSinceCreation);
  
  // Logarithmic scaling
  const valueScore = Math.log(1 + accessRate / 0.02) * 0.8;
  
  // Hub score from entity links
  const hubScore = calculateHubScore(memory.entityLinks.length);
  
  return sigmoid(valueScore + hubScore);
}
```

#### C. Firestore Vector Search for Retrieval
```typescript
// Use Firestore's native vector search (or Pinecone)
async function retrieveRelevantMemories(
  query: string,
  userId: string,
  limit: number = 10
): Promise<Memory[]> {
  const queryEmbedding = await generateEmbedding(query);
  
  // Firestore vector search (GA as of 2024)
  const results = await db
    .collection('memories')
    .where('uid', '==', userId)
    .findNearest({
      vectorField: 'embedding',
      queryVector: queryEmbedding,
      limit,
      distanceMeasure: 'COSINE'
    })
    .get();
  
  return results.docs.map(doc => doc.data() as Memory);
}
```

### Pros
- ✅ **Stay in Firebase ecosystem:** No new infrastructure
- ✅ **Selective adoption:** Take only the patterns that matter (decay, extraction)
- ✅ **No upstream dependency:** No risk of MIRA breaking changes
- ✅ **TypeScript native:** Matches existing Mora codebase

### Cons
- ❌ **Significant development:** Porting memory logic is non-trivial
- ❌ **Missing features:** Won't get working memory trinkets, full entity graph
- ❌ **Reinventing wheel:** MIRA already solved these problems well
- ❌ **Maintenance burden:** Must maintain memory system ourselves

### Effort Estimate
- Memory extraction port: 4-5 days
- Decay scoring: 2-3 days
- Entity extraction (simplified): 3-4 days
- Vector search integration: 2-3 days
- Testing and refinement: 3-4 days
- **Total: 14-19 days**

---

## Recommendation: Option 1 (Sidecar Service)

### Why Option 1 Wins

| Criteria | Option 1 | Option 2 | Option 3 |
|----------|----------|----------|----------|
| Time to value | ⭐⭐⭐ Fast | ⭐ Slow | ⭐⭐ Medium |
| MIRA changes needed | ⭐⭐⭐ None | ⭐⭐ Some | ⭐⭐⭐ None |
| Feature completeness | ⭐⭐⭐ Full MIRA | ⭐⭐⭐ Full MIRA | ⭐⭐ Partial |
| Operational complexity | ⭐⭐ Medium | ⭐⭐ Medium | ⭐⭐⭐ Low |
| Future flexibility | ⭐⭐⭐ High | ⭐⭐ Medium | ⭐⭐ Medium |
| Risk | ⭐⭐⭐ Low | ⭐⭐ Medium | ⭐⭐ Medium |

### Key Reasons

1. **Minimal MIRA Changes:** User's constraint ("minimal updates to mira-oss directory") is best satisfied by using it as a service.

2. **Separation of Concerns:** Firebase handles what it's good at (auth, billing, fast listing), MIRA handles what it's good at (memory, AI reasoning).

3. **Gradual Adoption:** Can start with journal entries, expand to full memory system over time.

4. **Easy Rollback:** If MIRA doesn't work out, Firebase Function can fall back to direct AI calls.

---

## UX Implementation: "Add a Random Journal Entry"

### Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                      Home Screen                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [+] New Journal Entry                                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Recent Topics                                                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│  │ 💼 Work    │  │ ❤️ Partner │  │ 🏠 Family  │                 │
│  │ 3 entries  │  │ 7 entries  │  │ 2 entries  │                 │
│  └────────────┘  └────────────┘  └────────────┘                 │
└─────────────────────────────────────────────────────────────────┘

                          │ Tap "New Journal Entry"
                          ▼

┌─────────────────────────────────────────────────────────────────┐
│              What's on your mind?                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │  Had a tough meeting with Sarah today. She seemed        │    │
│  │  frustrated when I pushed back on the timeline.          │    │
│  │  I'm worried she thinks I'm not being a team player.     │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Submit]                                                        │
└─────────────────────────────────────────────────────────────────┘

                          │ Processing...
                          ▼

┌─────────────────────────────────────────────────────────────────┐
│              Analysis                                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  📍 This seems related to:                               │    │
│  │     • Work (existing topic)                              │    │
│  │     • Sarah (new person detected)                        │    │
│  │                                                          │    │
│  │  💭 What I'm noticing:                                   │    │
│  │     - Fear of being seen as uncooperative                │    │
│  │     - Uncertainty about Sarah's actual feelings          │    │
│  │     - Wanting to be both authentic AND liked             │    │
│  │                                                          │    │
│  │  🔗 Related memories:                                    │    │
│  │     - "Struggled with saying no to Jake last month"      │    │
│  │     - "Manager said 'pushback is healthy' in 1:1"        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Draft a message to Sarah]  [Just save this]                    │
└─────────────────────────────────────────────────────────────────┘
```

### Key UX Principles
1. **No upfront categorization:** User just writes; topics emerge
2. **Show related memories:** MIRA's proactive memory in action
3. **Suggest next action:** Draft message if it seems actionable
4. **Build topic graph organically:** Over time, user's life becomes navigable

---

## Next Steps (If Option 1 Approved)

1. **Week 1: MIRA Deployment**
   - [ ] Deploy MIRA-OSS to Cloud Run (or Fly.io)
   - [ ] Configure PostgreSQL (Cloud SQL or Neon)
   - [ ] Configure Valkey (Upstash or Redis Cloud)
   - [ ] Set up Vault for secrets (or use GCP Secret Manager)

2. **Week 2: Firebase Bridge**
   - [ ] Create `processEntry` Cloud Function
   - [ ] Implement user ID mapping (Firebase UID → MIRA user)
   - [ ] Create Firestore sync for topics/entries

3. **Week 3: Frontend UX**
   - [ ] Build "New Journal Entry" flow
   - [ ] Build Topics grid view
   - [ ] Build Entry detail view with memories

4. **Week 4: Polish & Test**
   - [ ] End-to-end testing
   - [ ] Performance optimization
   - [ ] Rate limiting and quota checks

---

## Open Questions

1. **Encryption:** Mora has E2E encryption via passphrase. How do we handle encrypted content with MIRA's memory extraction? Options:
   - Decrypt in Cloud Function before sending to MIRA (keys never leave secure context)
   - Don't encrypt journal entries (simpler, but less privacy)

2. **Existing Data:** Do we migrate existing conversations/unpacks to MIRA, or start fresh for journal entries?

3. **Billing Integration:** Does MIRA processing count against unpack limits, or is it a new "entries" quota?

4. **Offline Support:** MIRA requires network. How do we handle offline journal entries? Queue and process later?

---

## Appendix: MIRA-OSS Key Files Reference

| File | Purpose |
|------|---------|
| `main.py` | FastAPI entry point, single-user setup |
| `cns/api/chat.py` | Chat endpoint (non-streaming) |
| `lt_memory/extraction.py` | Memory extraction service |
| `lt_memory/models.py` | Memory data models |
| `lt_memory/scoring_formula.sql` | Importance scoring algorithm |
| `working_memory/trinkets/` | Dynamic system prompt components |
| `config/prompts/` | LLM prompt templates |
| `deploy/mira_service_schema.sql` | PostgreSQL schema |

---

## Appendix: Domaindocs Architecture (Deep Dive)

### Storage Model
Unlike LT_Memory (PostgreSQL), Domaindocs use **per-user SQLite**:
```
data/users/{user_id}/userdata.db
├── domaindocs (metadata: label, description, enabled)
├── domaindoc_sections (hierarchical content, max 1 level deep)
└── domaindoc_versions (audit trail of all edits)
```

### How MIRA Edits Domaindocs
MIRA has a `DomaindocTool` that allows it to autonomously manage its own knowledge:

```python
# Example: MIRA discovers a behavioral pattern and updates its self-model
tool_call(
    operation="append",
    label="personal_context",
    section="BEHAVIORAL PATTERNS",
    content="\n- **Validation First Bias.** I tend to agree with user framing before analyzing critically..."
)
```

### Available Operations
| Operation | Purpose |
|-----------|---------|
| `expand` / `collapse` | Manage section visibility in system prompt |
| `create_section` | Add new section or subsection |
| `append` | Add content to end of section |
| `sed` / `sed_all` | Find/replace within section |
| `replace_section` | Replace entire section content |
| `delete_section` | Remove section (must expand first) |

### Token Management
Domaindocs use smart collapse/expand to manage context window:
- **Expanded sections:** Full content in system prompt
- **Collapsed sections:** Header only (saves tokens)
- MIRA can self-manage by collapsing irrelevant sections

### Mora-Specific Domaindocs (Proposed)

| Label | Purpose | Example Content |
|-------|---------|-----------------|
| `personal_context` | User's self-insights | "I over-explain when anxious", "I use 'just' too much" |
| `partner_playbook` | Partner-specific patterns | "Alex needs space before repair", "Don't use 'I feel attacked'" |
| `manager_playbook` | Work relationship patterns | "Sarah values directness", "Push back on timeline, not quality" |
| `draft_style` | User's texting voice | "Short sentences", "Lowercase casual", "Emoji: sparingly" |

### Key Insight for Mora
The `personal_context` domaindoc is where MIRA builds its self-model through observation. For Mora, this means:

1. **MIRA learns your patterns:** "Kapil over-explains when defensive", "Tends to seek reassurance"
2. **Persists forever:** Unlike memories that decay, these insights stay
3. **User can edit:** See what MIRA thinks, correct it, add your own insights
4. **Powers better drafts:** "I notice you're about to explain. Drop the shield?"

This is exactly what Mora's "Fear of Hurting" philosophy needs — a system that learns YOUR specific patterns and holds you accountable to them.

---

## Deep Dive: MIRA-OSS Product Philosophy

### "Just Talk Normal" — The Core Design Principle

From [ARCHITECTURE_LT_MEMORY.md](mira-OSS/docs/ARCHITECTURE_LT_MEMORY.md):

> "All this machinery serves a simple goal: **users shouldn't think about memory.**
> They don't tag things as important. They don't curate a profile. They don't worry about what the AI remembers or forgets. They just talk.
> Complexity in the implementation enables simplicity in the interface."

**Implication for Mora:** Users shouldn't have to organize conversations, tag people, or structure their input. They "just talk" and the system figures out the rest.

### Activity-Based Decay (Vacation-Proof)

MIRA tracks `cumulative_activity_days` — the total number of distinct days a user has engaged. Decay calculations use this counter, NOT calendar time.

> "A user who engages daily for a month then takes two weeks off would return to degraded memories [with calendar-based decay]. The system should measure engagement depth, not wall-clock elapsed time."

**Implication for Mora:** Users who take breaks from the app (common after relationship repair) won't return to find their context degraded.

### Memory Link Types — Semantic Relationships

MIRA doesn't just store memories — it builds a **knowledge graph** with typed relationships:

| Link Type | Meaning | Mora Use Case |
|-----------|---------|---------------|
| `conflicts` | Mutually exclusive information | "You said X but also Y — which is current?" |
| `supersedes` | Temporal update | "You used to react this way, now you react differently" |
| `causes` | Direct causation | "That message caused the escalation" |
| `instance_of` | Concrete example of pattern | "This is another example of your over-explaining pattern" |
| `invalidated_by` | Empirical disproof | "You thought this approach worked but evidence shows otherwise" |
| `motivated_by` | Intent behind decision | "You set that boundary because..." |

### The Continuum Model — No Distinct "Conversations"

MIRA has ONE continuous conversation per user (the "continuum"), not separate threads. Messages are organized into **segments** (like chapters) that collapse after inactivity.

From [CNS_EVENT_ARCHITECTURE.md](mira-OSS/docs/CNS_EVENT_ARCHITECTURE.md):
- When a user stops talking for a while, the segment "collapses" into a summary
- The summary joins the **manifest** (table of contents)
- New conversation picks up from manifest context

**Implication for Mora's UX Question:** This is fundamentally different from Mora's "people threads" model. Options:
1. **One continuum per person** — Keep Mora's compartmentalization but use MIRA's memory per-person
2. **One continuum total** — Full MIRA model, topics emerge via entity extraction
3. **Hybrid** — Default continuum + "focus on [Person]" filter

### Tools as Self-Management

MIRA's tools aren't just for external actions — they enable **self-management**:
- `DomaindocTool`: MIRA edits its own knowledge base
- `GetContextTool`: MIRA searches its own memory
- Dynamic tool loading: Tools load/unload based on conversation needs

### Provider Architecture — Offline-First

MIRA is designed to run **completely offline** with local models:
- Default fallback: `qwen3:1.7b` via Ollama
- Embeddings: Local sentence transformers (no API calls)
- Emergency failover: If Anthropic fails, traffic routes to local model

**Implication for Mora:** Could offer "privacy mode" with local-only processing.

---

## MIRA vs Mora: Feature Mapping

| Mora Feature | MIRA Equivalent | Notes |
|--------------|-----------------|-------|
| **Conversations** | Continuum segments | MIRA has one stream; Mora has per-person |
| **Unpacks** | Memory extraction + proactive surfacing | MIRA extracts automatically, no manual trigger |
| **Reply Drafting** | LLM response with memory context | MIRA doesn't have draft-specific prompts |
| **Playbook** | Domaindocs | Perfect match! Persistent, editable, collaborative |
| **People** | Entities (auto-extracted) | MIRA discovers people via NER, doesn't require upfront definition |
| **Therapy Speak Detector** | Could be a Domaindoc section | "Phrases to avoid" as permanent knowledge |
| **No-Shield Rule** | Could be encoded in `personal_context` | MIRA tracks its own behavioral patterns |

### What MIRA Has That Mora Doesn't

1. **Semantic memory retrieval** — Vector search finds relevant context, not just keyword
2. **Memory consolidation** — Redundant memories merge automatically
3. **Supersession tracking** — "This replaces that" for evolving beliefs
4. **Self-model** — AI learns its own patterns with you
5. **Activity-based decay** — Vacation-proof memory
6. **Streaming responses** — Real-time typing effect
7. **Tool system** — Extensible actions (reminders, web search, smart home)

### What Mora Has That MIRA Doesn't

1. **Per-person compartmentalization** — Distinct relationship contexts
2. **Draft variants** — Multiple tone options (short/medium/ultra-brief)
3. **Explicit "Unpack" output format** — Structured analysis template
4. **Encryption** — Client-side E2E encryption
5. **Mobile-first design** — MIRA is desktop/CLI focused
6. **Stripe billing** — MIRA is single-user, no monetization
