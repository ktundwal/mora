# MIRA-OSS Integration for Mora

**Last Updated:** January 10, 2026  
**Status:** Planning (Not Implemented)

> This document describes which MIRA components Mora will use and how they map to Mora's product needs. It serves as a bridge between the generic MIRA system and Mora's specific "AI thought partner for high-stakes moments" use case.

---

## Why MIRA?

Mora's defensible moat is **an AI that knows you over time**. Generic LLMs reset every conversation. MIRA provides:

1. **Persistent memory** that decays naturally unless "earned" through use
2. **Entity knowledge graphs** linking memories about people, topics, patterns
3. **Proactive surfacing** of relevant context without user prompting
4. **Domaindocs** for collaborative, non-decaying wisdom (relationship playbooks)

Without MIRA, Mora is "paste → analyze → done" (commodity). With MIRA, Mora becomes "I remember last time you felt this way about Sarah..."

---

## MIRA Components Mora Will Use

### 1. LT_Memory (Long-Term Memory)

**Location:** `lt_memory/`

**What it does:** Extracts, stores, links, and retrieves discrete memories from conversations. Memories decay via activity-based formula unless reinforced.

**Mora use cases:**

| Mora Feature | MIRA Component | How It Works |
|-------------|----------------|--------------|
| Pattern recognition over time | `lt_memory/extraction.py` | Extract "User tends to over-explain when defensive" from journal entries |
| "Last time with Sarah..." | `lt_memory/proactive.py` | Surface relevant memories when user pastes new conflict |
| Memory decay | `lt_memory/scoring_formula.sql` | Old, unused insights fade; frequently-referenced ones persist |
| Entity linking | `lt_memory/entity_extraction.py` | Link memories to people (Sarah, Manager, Mom) for entity-based retrieval |

**Key models from `lt_memory/models.py`:**

```python
Memory:
  - text: str                    # "User over-explains when Sarah is upset"
  - importance_score: float      # 0.0-1.0, calculated via scoring formula
  - entity_links: List[Entity]   # Links to people, topics
  - inbound_links/outbound_links # Relationships between memories
  - access_count, mention_count  # Usage signals that prevent decay
  - happens_at: datetime         # For calendar-aware memories
```

**Scoring formula key constants (from `scoring_formula.sql`):**

- Memories start at ~0.5 importance and must "earn their keep"
- 15 activity-day grace period for new memories
- Momentum decay: 5% per activity day if not accessed
- Entity links boost importance (PERSON entities weighted highest)
- Explicit LLM references (mention_count) are strongest signal

---

### 2. Domaindocs (Non-Decaying Wisdom)

**Location:** `tools/implementations/domaindoc_tool.py`, `working_memory/trinkets/domaindoc_trinket.py`

**What it does:** Collaborative documents that AI and user co-create. Unlike memories, domaindocs don't decay—they're permanent playbooks.

**Mora use cases:**

| Mora Feature | MIRA Component | How It Works |
|-------------|----------------|--------------|
| Relationship playbooks | Domaindoc per person | "What works when talking to Sarah about money" |
| Personal patterns catalog | "knowledgeofself" domaindoc | User's identified triggers, defaults, growth areas |
| Work communication guides | Domaindoc per context | "How to give feedback to direct reports" |

**Example Mora domaindocs:**

```
domaindoc: "relationship:sarah"
sections:
  - "What triggers me"
  - "What triggers her"  
  - "What works"
  - "What makes it worse"
  - "Our history" (key moments, repairs)

domaindoc: "knowledgeofself"
sections:
  - "My defensive patterns"
  - "What I actually need when triggered"
  - "My growth edges"
  - "Things I'm proud of"
```

**Key feature:** Domaindocs support expand/collapse sections. AI can autonomously manage section visibility to keep context window efficient.

---

### 3. Proactive Memory Surfacing

**Location:** `lt_memory/proactive.py`, `working_memory/trinkets/proactive_memory_trinket.py`

**What it does:** When user sends a message, MIRA automatically surfaces relevant memories from the knowledge graph without being asked.

**Mora use case:**

User pastes: "Sarah just said 'fine, do whatever you want'"

MIRA automatically surfaces:
```xml
<surfaced_memories>
  <memory id="M12a" confidence="87">
    <text>Last time Sarah said "fine" she was actually hurt about feeling unheard</text>
    <created>3 weeks ago</created>
  </memory>
  <memory id="M08c" confidence="72">
    <text>User's pattern: tends to take "fine" literally and miss the subtext</text>
    <linked_memories>
      <memory id="M04a">Similar situation in March led to 3-day silence</memory>
    </linked_memories>
  </memory>
</surfaced_memories>
```

**Key config from `ProactiveConfig`:**

- `max_memories`: How many to surface (default: 10)
- `similarity_threshold`: Minimum relevance score
- `min_importance_score`: Only surface memories that have "earned their keep"

---

### 4. Entity Knowledge Graph

**Location:** `lt_memory/entity_extraction.py`, `lt_memory/linking.py`

**What it does:** Extracts named entities (PERSON, ORG, EVENT) from memories and builds a knowledge graph connecting memories through entities.

**Mora use case:**

```
Entity: "Sarah" (PERSON)
├── 47 linked memories
├── Most recent: 2 days ago
├── Relationship type: romantic_partner (from Mora's People layer)
└── Entity weight: 1.0 (highest priority for PERSON)

Query: "Show me everything about Sarah"
→ Returns all memories linked to Sarah entity
→ Includes linked memories (e.g., "Mom's advice about Sarah")
```

**Entity types and weights (from `scoring_formula.sql`):**

| Type | Weight | Mora Use |
|------|--------|----------|
| PERSON | 1.0 | People in user's life (Sarah, Manager, Mom) |
| EVENT | 0.9 | Key moments ("The fight about the wedding") |
| ORG | 0.8 | Work context ("Acme Corp", "the team") |
| PRODUCT | 0.7 | Topics ("the house", "the promotion") |

---

### 5. Working Memory & Trinkets

**Location:** `working_memory/`, `working_memory/trinkets/`

**What it does:** Composes the system prompt dynamically using "trinkets"—pluggable sections that update based on context.

**Relevant trinkets for Mora:**

| Trinket | Purpose | Mora Customization |
|---------|---------|-------------------|
| `proactive_memory_trinket.py` | Inject surfaced memories | Already perfect for Mora |
| `domaindoc_trinket.py` | Inject relationship playbooks | Already perfect for Mora |
| `time_manager.py` | Current time context | Already perfect |
| **NEW: `pattern_trinket.py`** | Inject user's bookmarked patterns | Mora-specific, needs creation |
| **NEW: `person_context_trinket.py`** | Inject current person's relationship context | Mora-specific, needs creation |

---

## MIRA Components Mora Will NOT Use

| Component | Why Not |
|-----------|---------|
| `tools/implementations/email_tool.py` | Mora doesn't send emails |
| `tools/implementations/weather_tool.py` | Not relevant |
| `tools/implementations/maps_tool.py` | Not relevant |
| `tools/implementations/kasa_tool.py` | Smart home, not relevant |
| `tools/implementations/punchclock_tool.py` | Time tracking, not relevant |
| `tools/implementations/pager_tool.py` | Personal paging, maybe later |
| `api/federation.py` | Multi-tenant, not needed initially |
| `cns/` (Continuum) | MIRA's conversation management; Mora uses its own UI |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mora Frontend (Next.js)                     │
│  • User writes journal entry / pastes conversation              │
│  • UI shows surfaced memories, playbooks, pattern alerts        │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Firebase Function call
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│               Firebase Cloud Function (Node.js)                 │
│  • Validates auth, checks quota                                 │
│  • Maps Firebase UID → MIRA user_id                             │
│  • Forwards to MIRA API                                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Authenticated HTTPS (Bearer + IAM)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   MIRA-OSS (Cloud Run)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  LT_Memory      │  │  Domaindocs     │  │  Proactive      │ │
│  │  (extraction,   │  │  (playbooks,    │  │  (surfacing,    │ │
│  │   linking,      │  │   sections,     │  │   entity        │ │
│  │   scoring)      │  │   co-editing)   │  │   retrieval)    │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           └────────────────────┼────────────────────┘          │
│                                ▼                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Supabase PostgreSQL (User-Isolated RLS)        │  │
│  │   • memories table (with scoring formula)                │  │
│  │   • entities table (knowledge graph nodes)               │  │
│  │   • domaindocs + domaindoc_sections tables               │  │
│  │   • users table (activity tracking for decay)            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mora-Specific Customizations Needed

### 1. Custom Trinkets

**`pattern_trinket.py`** (NEW)
- Inject user's bookmarked patterns from `COMMON_PATTERNS`
- Format: "Patterns you're watching: Over-Explaining, Reassurance Seeking"
- Helps AI recognize when user is falling into known patterns

**`person_context_trinket.py`** (NEW)
- Inject current relationship context when analyzing conversation
- Format: "Relationship: Sarah (romantic partner, 3 years). Key history: [from domaindoc]"

### 2. Mora-Specific Domaindocs

Prepopulate new users with starter domaindocs:
- `knowledgeofself` - Personal patterns (MIRA ships with this, perfect for Mora)
- `relationship_template` - Template for relationship playbooks

### 3. Entity Type Extensions

Consider adding Mora-specific entity types:
- `RELATIONSHIP_PARTNER` - Higher weight than generic PERSON
- `FAMILY_MEMBER` - Different retrieval priority
- `COWORKER` - Work context

### 4. Memory Extraction Prompts

Customize `config/prompts/memory_extraction_*.txt` for Mora's domain:
- Extract emotional patterns, not just facts
- Identify conflict triggers
- Note relationship dynamics

---

## API Endpoints Mora Will Call

From MIRA's FastAPI surface:

| Endpoint | Purpose | Mora Use |
|----------|---------|----------|
| `POST /chat` | Send message, get response + surfaced memories | Main analysis flow |
| `GET /data/memories` | List user's memories | "Memory" tab in settings |
| `POST /actions/memory` | Manually create memory | User saves insight |
| `GET /data/domaindocs` | List domaindocs | Relationship playbook list |
| `POST /actions/domaindoc` | Create/update domaindoc | User edits playbook |
| `GET /data/entities` | List entities (people, topics) | People knowledge graph |

---

## Migration Path

### Phase 1: Deploy MIRA (mora-ddy)
- Get MIRA running on Cloud Run with Supabase
- Create Firebase UID → MIRA user_id mapping
- Basic health check from Firebase Function

### Phase 2: Memory Extraction
- Route journal entries through MIRA for memory extraction
- Surface memories on new entries (proactive)
- Display "what MIRA remembers" in UI

### Phase 3: Domaindocs
- Create relationship playbook UI
- Map Mora's "People" to MIRA entities + domaindocs
- Enable user editing of playbooks

### Phase 4: Pattern Integration
- Connect Mora's `COMMON_PATTERNS` to MIRA's pattern detection
- Create pattern_trinket for personalized alerts
- "You're about to over-explain again" real-time nudges

---

## Questions to Resolve

1. **Encryption:** MIRA stores plaintext in PostgreSQL. Mora has E2E encryption. Options:
   - Decrypt in Firebase Function before sending to MIRA (current plan)
   - Modify MIRA to work with encrypted data (complex)
   - Accept that MIRA layer sees decrypted content (privacy tradeoff)

2. **Continuum:** MIRA expects one infinite conversation thread. Mora has discrete journal entries. Options:
   - Treat each entry as a conversation turn
   - Create synthetic "sessions" that map to Mora entries
   - Fork MIRA to support discrete entry model

3. **Real-time vs Batch:** MIRA processes memories synchronously. For scale:
   - Keep sync for MVP
   - Add async memory extraction queue at scale

---

## References

- [MIRA README](./README.md) - Original MIRA documentation
- [MIRA CLAUDE.md](./CLAUDE.md) - Development principles
- [ADR-001 MIRA Integration](../docs/decisions/001-mira-oss-integration.md) - Why MIRA
- [ADR-003 Data Storage](../docs/decisions/003-data-storage-strategy.md) - Supabase decision
