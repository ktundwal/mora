# UX Design: Memory-First Experience

**Status:** Proposed  
**Date:** January 10, 2026  
**Author:** Kapil + Claude  

> **Core Thesis:** Mora's moat is the AI that knows you over time. The UX must make this visible and magical from day one.

---

## Design Principles

1. **Memory is visible** — Users should always see what Mora remembers
2. **History proves value** — Show "last time with X" to create "holy shit" moments
3. **Patterns emerge, not assigned** — Don't ask users to pick patterns; detect them
4. **Playbooks are co-created** — User and AI build wisdom together
5. **Loss aversion drives retention** — Pro tier protects your accumulated knowledge

---

## Screen Designs

### 1. Home Screen: "Your Story So Far"

**Replaces:** Current People list  
**Purpose:** Show the growing memory layer front and center

```
┌─────────────────────────────────────────────────────┐
│  Mora                                    [Settings] │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Good evening, Kapil.                               │
│                                                     │
│  ┌─────────────────────────────────────────────────┐
│  │ 📊 Your Story                                  │
│  │    47 memories · 3 playbooks · 2 patterns      │
│  │                                                 │
│  │ Sarah                              2 days ago  │
│  │ "You tend to over-explain when she's quiet"    │
│  │                                                 │
│  │ Work                               Pattern ⚠️  │
│  │ "Ruinous empathy with direct reports"          │
│  │                                                 │
│  │ Mom                                   Calm 💚  │
│  │ 23 days since last conflict                    │
│  │                                                 │
│  │                            [See all memories →]│
│  └─────────────────────────────────────────────────┘
│                                                     │
│  ┌─────────────────────────────────────────────────┐
│  │  What's on your mind?                          │
│  │                                                 │
│  │  [ Write in journal ]                          │
│  │  [ Paste a conversation ]                      │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  Recent entries                                     │
│  ─────────────────────────────────────────────────  │
│  😤 "Frustrated about the promotion"    Today     │
│  💔 "Sarah said she needs space"        2 days    │
│  😬 "Feedback to Jamie went poorly"     5 days    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key elements:**
- **Memory count** — "47 memories" creates FOMO about losing history
- **Per-person insights** — AI surfaces most relevant recent insight
- **Pattern alerts** — Proactive pattern detection (e.g., "Pattern ⚠️")
- **Relationship health** — "Calm 💚" vs conflict indicators
- **Two entry points** — Journal (reflective) vs Paste (reactive)

---

### 2. Journal Entry: Memory Surfacing While You Write

**Replaces:** Current "New Entry" page  
**Purpose:** Show "I remember" before user even submits

```
┌─────────────────────────────────────────────────────┐
│  ← Back                              New Entry      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Who is this about?                                 │
│  ┌─────────────────────────────────────────────────┐
│  │ Sarah                                      ▾   │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  What's happening?                                  │
│  ┌─────────────────────────────────────────────────┐
│  │ Sarah just said "I don't want to talk about    │
│  │ it anymore." I know I should let it go but     │
│  │ I can't stop thinking about what she really    │
│  │ meant. Maybe I should text her again to        │
│  │ clear the air...                               │
│  │                                                 │
│  │                                                 │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  ╭───────────────────────────────────────────────╮ │
│  │ 💭 From your history with Sarah               │ │
│  │                                               │ │
│  │ "When Sarah says she doesn't want to talk,    │ │
│  │  giving her 24 hours usually leads to better  │ │
│  │  resolution than texting again."              │ │
│  │                           — Mar 12, 2025      │ │
│  │                                               │ │
│  │ ⚠️ Pattern: You've asked for reassurance in   │ │
│  │    4 of the last 5 conflicts with Sarah       │ │
│  │                                    [Learn →]  │ │
│  ╰───────────────────────────────────────────────╯ │
│                                                     │
│            [ Get help with this ]                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key elements:**
- **Person selector** — Ties entry to relationship for memory retrieval
- **Memory box appears after ~50 chars** — Debounced search against MIRA
- **Specific memory citation** — Shows date to prove it's real history
- **Pattern alert inline** — Intervention before they make the mistake
- **"Learn →" link** — Goes to pattern detail (from COMMON_PATTERNS)

**Technical notes:**
- Memory surfacing: 500ms debounce on text input
- API call: `POST /mira/surface` with person_id + current text
- Fallback: If MIRA unavailable, show nothing (graceful degradation)
- First-time users: Show "Mora will remember this for next time"

---

### 3. Analysis Result: Connected to History

**Replaces:** Current analysis view  
**Purpose:** Link current moment to past patterns

```
┌─────────────────────────────────────────────────────┐
│  ← Back                               Analysis      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  What Sarah might be feeling                        │
│  ───────────────────────────────────────────────── │
│  "Overwhelmed. When she says 'I don't want to      │
│   talk,' she likely needs space to process, not    │
│   more words. Your instinct to text again could    │
│   feel like pressure, even if you mean well."      │
│                                                     │
│  ┌─────────────────────────────────────────────────┐
│  │ 🔗 Similar moments from your history           │
│  │                                                 │
│  │ Mar 12 — Same phrase                           │
│  │ You waited 24 hours → She reached out first    │
│  │ → Resolution: Good ✓                           │
│  │                                                 │
│  │ Jan 8 — Same phrase                            │
│  │ You texted 3 more times → 3-day silence        │
│  │ → Resolution: Painful ✗                        │
│  │                                                 │
│  │                            [See full history]  │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  Pattern I'm noticing                               │
│  ───────────────────────────────────────────────── │
│  ⚠️ Asking for Reassurance                         │
│  You're doing this right now. The urge to text    │
│  "are we okay?" will give you temporary relief    │
│  but often extends the conflict.                   │
│                                                     │
│  [Read about this pattern] [I've moved past this] │
│                                                     │
│  What you might try                                 │
│  ───────────────────────────────────────────────── │
│  ┌─────────────────────────────────────────────────┐
│  │ ⏰ Wait 24 hours before texting                │
│  │                                                 │
│  │ 💬 When you do reach out, try:                 │
│  │    "I've been thinking about you. No pressure  │
│  │     to respond—just wanted you to know I       │
│  │     care."                                      │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  💾 Add to Sarah's playbook:                        │
│     [ What works ] [ What doesn't work ]           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key elements:**
- **"Similar moments"** — The magic moment that proves memory value
- **Outcome tracking** — "Resolution: Good ✓" helps AI learn what works
- **Active pattern alert** — "You're doing this right now"
- **Action buttons** — Move past pattern, save to playbook
- **Playbook integration** — One tap to capture wisdom

---

### 4. Relationship Playbook (Domaindoc)

**New screen**  
**Purpose:** Permanent, co-created wisdom about this relationship

```
┌─────────────────────────────────────────────────────┐
│  ← Back                        Sarah's Playbook 📖  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Co-created with Mora · Last updated 2 days ago    │
│                                                     │
│  ▼ What triggers her                                │
│  ─────────────────────────────────────────────────  │
│  • Feeling unheard, especially about work stress    │
│  • When I explain instead of acknowledge            │
│  • Making decisions without checking in first       │
│  • Feeling like I'm "fixing" instead of listening   │
│                                                     │
│  ▼ What triggers me                                 │
│  ─────────────────────────────────────────────────  │
│  • Her silence (I assume she's angry)               │
│  • "Fine" or "whatever" responses                   │
│  • Feeling like I can't make it better              │
│  • Not knowing if we're okay                        │
│                                                     │
│  ▼ What works                                       │
│  ─────────────────────────────────────────────────  │
│  ✓ Leading with "I hear you" before anything else  │
│  ✓ Giving her 24 hours when she needs space        │
│  ✓ Asking "What do you need right now?"            │
│  ✓ Physical touch (hand on shoulder) vs words      │
│                                    [ + Add more ]  │
│                                                     │
│  ▼ What makes it worse                              │
│  ─────────────────────────────────────────────────  │
│  ✗ Multiple texts when she's quiet                  │
│  ✗ Over-explaining my reasoning (Pattern: active)  │
│  ✗ Asking "Are we okay?" repeatedly                │
│  ✗ Trying to solve before she's ready              │
│                                    [ + Add more ]  │
│                                                     │
│  ▼ Key moments (12 memories)                        │
│  ─────────────────────────────────────────────────  │
│  [View timeline →]                                  │
│                                                     │
│  ────────────────────────────────────────────────── │
│  [ Edit playbook ]              [ Share insights ] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key elements:**
- **Collapsible sections** — Maps to MIRA domaindoc sections
- **"Pattern: active" badge** — Links to pattern when relevant
- **User can add/edit** — It's collaborative, not read-only
- **Key moments link** — Shows timeline of memories for this person
- **Share insights** — Future: export for therapy, share with partner

---

### 5. Memory Browser

**New screen**  
**Purpose:** Let users see (and trust) what Mora remembers

```
┌─────────────────────────────────────────────────────┐
│  ← Back                          Your Memories 🧠   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  47 memories · Oldest: 8 months ago                 │
│                                                     │
│  Filter: [All ▾] [Sarah ▾] [Work ▾] [Patterns ▾]   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  Today                                              │
│  ┌─────────────────────────────────────────────────┐
│  │ "When frustrated about work, I tend to vent    │
│  │  at Sarah even when she's not involved"        │
│  │                                                 │
│  │  🔗 Sarah, Work    ⭐ Importance: High         │
│  │  [Edit] [Delete] [This is wrong]               │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  2 days ago                                         │
│  ┌─────────────────────────────────────────────────┐
│  │ "Giving Sarah 24 hours when she says 'I don't  │
│  │  want to talk' leads to better outcomes"       │
│  │                                                 │
│  │  🔗 Sarah    ⭐ Importance: High               │
│  │  [Edit] [Delete] [This is wrong]               │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  5 days ago                                         │
│  ┌─────────────────────────────────────────────────┐
│  │ "Jamie responds better to written feedback     │
│  │  than verbal—gives him time to process"        │
│  │                                                 │
│  │  🔗 Work, Jamie    ⭐ Importance: Medium       │
│  │  [Edit] [Delete] [This is wrong]               │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  ... load more ...                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key elements:**
- **Memory count + age** — Shows depth of history
- **Filters** — By person, context, or pattern type
- **Importance indicator** — From MIRA's scoring formula
- **Correction actions** — "This is wrong" feeds back to MIRA
- **Edit capability** — User can refine what AI learned

---

### 6. Pattern Detail

**Enhancement to existing PatternCard**  
**Purpose:** Connect general patterns to user's specific history

```
┌─────────────────────────────────────────────────────┐
│  ← Back                     Asking for Reassurance  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ❓ What it is                                       │
│  ─────────────────────────────────────────────────  │
│  After conflict or silence, you ask "Are we okay?" │
│  or "Are you mad?" The relief is temporary. The    │
│  anxiety returns. The question becomes a pattern.  │
│                                                     │
│  📝 Examples                                         │
│  • "Are we okay?"                                   │
│  • "Are you still upset?"                           │
│  • "Just tell me we're fine and I'll drop it"      │
│                                                     │
│  💡 The underlying need                              │
│  Safety and certainty in the relationship          │
│                                                     │
│  🔄 What to try instead                              │
│  Sit with the discomfort. They'll show you         │
│  they're okay through actions. If you must ask,    │
│  ask once and trust the answer.                    │
│                                                     │
│  ─────────────────────────────────────────────────  │
│                                                     │
│  🔗 Your history with this pattern                  │
│  ┌─────────────────────────────────────────────────┐
│  │ Detected 7 times with Sarah                    │
│  │ Last: 2 days ago                               │
│  │                                                 │
│  │ Jan 8: Asked 3x → extended conflict            │
│  │ Dec 15: Asked once → resolved same day         │
│  │ Nov 22: Didn't ask → she reached out first     │
│  │                                                 │
│  │ 💡 When you don't ask, resolution is faster    │
│  └─────────────────────────────────────────────────┘
│                                                     │
│  [ I've moved past this ]  [ Still working on it ] │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Key elements:**
- **General pattern info** — From COMMON_PATTERNS
- **"Your history"** — Personalized data from MIRA
- **Pattern-specific insight** — AI learns what works for THIS user
- **Progress tracking** — "I've moved past this" updates pattern status

---

## User Flows

### Flow 1: New User (Cold Start)

```
Landing → Sign up → First Entry (no memories yet)
                         ↓
              "Mora will remember this for next time"
                         ↓
              Analysis (no "Similar moments" yet)
                         ↓
              Home shows "1 memory · Start your story"
```

**Cold start messaging:**
- "Mora gets smarter the more you use it"
- "Your first entries train Mora to know you"
- "Check back after 3-5 entries to see patterns emerge"

### Flow 2: Returning User (Warm)

```
Home (sees memory count, recent insights)
              ↓
New Entry → Starts typing → Memory box appears! 💡
              ↓
"From your history with Sarah: [relevant memory]"
              ↓
Analysis → "Similar moments" with outcomes
              ↓
Save insight to playbook → Playbook grows
```

### Flow 3: Pattern Intervention

```
User typing about conflict
              ↓
MIRA detects active pattern
              ↓
Memory box: "⚠️ Pattern: Asking for Reassurance"
              ↓
User reads pattern, decides to wait 24 hours
              ↓
Later: Marks "Resolution: Good" → MIRA learns
```

---

## Free vs Pro Tiers

| Feature | Free | Pro |
|---------|------|-----|
| Memories stored | 10 max | Unlimited |
| Playbooks | 1 | Unlimited |
| Pattern tracking | View only | Full history + alerts |
| Memory age | 30 days max | Forever |
| "Similar moments" | Last 3 | Full history |

**Upgrade prompts:**
- "You've hit 10 memories. Oldest will fade unless you upgrade."
- "Pro users see 8 similar moments. You're seeing 3."
- "Your memory from March will expire in 7 days."

---

## Implementation Phases

### Phase 1: Memory Surfacing (MVP)
- Memory box on journal entry (after MIRA deployed)
- "Mora remembered" section on analysis
- Basic memory browser

### Phase 2: Playbooks
- Create/edit relationship playbooks
- Link playbooks to MIRA domaindocs
- Save insights from analysis to playbook

### Phase 3: Pattern Integration
- Connect COMMON_PATTERNS to MIRA pattern detection
- Pattern history per user
- "You're doing this now" real-time alerts

### Phase 4: Outcomes & Learning
- Track resolution quality
- "Similar moments" with outcomes
- Pattern effectiveness stats

---

## Technical Dependencies

| Feature | Depends On |
|---------|-----------|
| Memory box | MIRA deployed (mora-ddy) + bridge (mora-r5o) |
| Playbooks | MIRA domaindocs API |
| Pattern alerts | MIRA + COMMON_PATTERNS linking |
| Memory browser | MIRA memories API |
| Outcome tracking | New field in entry model |

---

## Open Questions

1. **How to handle first 5 entries?** No memories yet = less magic. Need good cold-start UX.
2. **Memory corrections:** When user says "This is wrong", how does MIRA learn?
3. **Multi-person entries:** What if conflict involves Sarah AND Mom?
4. **Export:** Should users be able to export their memories/playbooks?

---

## Success Metrics

- **Retention:** Do users with 10+ memories retain better than new users?
- **"Holy shit" moment:** Time to first memory surfacing
- **Playbook engagement:** % of users who create/edit playbooks
- **Pattern resolution:** % of patterns marked "moved past this"
- **Upgrade trigger:** Do users upgrade when hitting memory limit?
