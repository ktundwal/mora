# Decision: Product Positioning & Market Strategy

**Date:** January 2026
**Status:** Approved
**Deciders:** Kapil

---

## Context

Mora started as a "relationship conflict resolution tool" focused on navigating high-stakes 1:1 relationships. After deep analysis and strategic review, we evaluated three positioning options:

1. **Relationship-Only** — Focus on romantic + family relationships
2. **Workplace-Only** — Focus on manager 1:1s and workplace communication
3. **Broad "Thought Partner"** — Work, relationships, and life decisions

Given:
- No rush to launch (time to build quality, compound content)
- Desire for broader appeal (larger TAM)
- MIRA's capability to handle any high-stakes decision (not just relationships)

---

## Decision

**Use Option 3: "AI Thought Partner for High-Stakes Moments"**

**Positioning:**
> Your AI thought partner for high-stakes moments in work, relationships, and life.

**Core Value Props:**
1. Real-time intervention (pause before reacting)
2. Pattern recognition (learn YOUR specific triggers)
3. Decision support (make better choices)
4. Self-model building (persistent wisdom)

---

## Rationale

### Why Broad Positioning Wins

**1. Larger TAM**
- Relationship-only: ~20M anxious-preoccupied adults in US
- Thought partner (work + life): ~80M knowledge workers
- **4x larger market opportunity**

**2. Multiple Paths to PMF**
- Entry point 1: Conflict resolution (acute pain)
- Entry point 2: Pattern recognition (recurring issues)
- Entry point 3: Decision support (life crossroads)
- If one fails, others can succeed

**3. Better Distribution**
- "Relationship tool" = narrow channels (r/relationships, therapy referrals)
- "Thought partner" = wide channels (LinkedIn, productivity blogs, journaling community)
- Easier to build content marketing at scale

**4. Higher Perceived Value**
- "Relationship coach" competes with therapy ($150/session)
- "Thought partner" competes with productivity tools ($10-15/mo), feels reasonable
- Easier to justify to workplace as "professional development"

**5. MIRA's Strength**
- MIRA's memory system works for ANY domain (not just relationships)
- Entity extraction finds: people, work projects, life themes
- Pattern recognition: defensive communication, decision paralysis, burnout cycles

### Why Not Relationship-Only (Option 1)

- ❌ Smaller TAM (~20M vs 80M)
- ❌ Stigma: "I need relationship help" is harder to admit than "I want better thinking"
- ❌ Seasonal: Relationship crises are periodic, engagement drops between incidents
- ❌ Competitive: MosaicChats, Paired, Lasting already own this space

### Why Not Workplace-Only (Option 2)

- ❌ Narrow wedge: Manager 1:1s = niche use case
- ❌ Enterprise sales cycle: Long, requires HR buy-in
- ❌ Lower WTP for individuals: Work tool = company should pay
- ❌ Competitive: Lattice, 15Five already established

---

## User Personas

### Primary: Knowledge Workers (Broad)

**Demographics:**
- Age: 25-45
- Income: $75k+
- Occupation: Tech, consulting, creative, management
- Location: Urban/suburban, US (initially)

**Psychographics:**
- Introspective, self-aware
- Anxious-leaning (not clinical)
- High-functioning despite internal struggle
- Values personal growth, emotional intelligence

**Jobs to Be Done:**
- Navigate tense conversation with manager
- Repair conflict with romantic partner
- Decide whether to quit job
- Set boundary with demanding parent
- Give performance feedback to direct report

### Secondary: Therapy Clients (Niche)

**Characteristics:**
- Already in therapy/coaching
- Needs "between sessions" support
- Willing to pay $25/mo for augmentation
- Values privacy (E2E encryption)

**Use Case:**
- Bring Mora insights to therapy
- Share specific conflicts with therapist (Advisor tier)
- Track progress on patterns therapist identified

### Tertiary: Managers (B2B Wedge)

**Characteristics:**
- Manages 2-10 people
- Struggles with difficult conversations
- Company has wellness budget
- Remote-first org (Slack-heavy)

**Use Case:**
- Pre-1:1 prep
- Post-1:1 reflection
- Manager playbook development

---

## Product Implications

### UX Changes (From Old Vision)

**Before (Relationship-Centric):**
```
Home → People List → Person Thread → Conversations
```
User chooses person first, then adds content.

**After (Topic-Centric):**
```
Home → Journal Entry (free-form) → Auto-categorized into Threads
```
User writes whatever, topics emerge organically.

### Feature Priorities

**Phase 1 (Months 1-3): Conflict Resolution**
- Still valid! High-stakes relationship moments are entry point #1
- Keep: Conversation paste, Unpack, reply drafts

**Phase 2 (Months 4-6): Pattern Recognition**
- NEW: Pattern dashboard ("You've mentioned work stress 7x this month")
- NEW: Related memories surfacing
- NEW: Timeline view (see evolution over weeks)

**Phase 3 (Months 7-9): Decision Support**
- NEW: Decision journaling ("Should I quit?")
- NEW: Pro/con mapping with memory context
- NEW: Values clarification exercises

**Phase 4 (Months 10-12): Self-Model**
- NEW: Domaindocs (collaborative knowledge)
- NEW: Relationship-specific playbooks
- NEW: Export to Obsidian/Notion

### Messaging Changes

**Before:**
> Navigate the moments that shape relationships.

**After:**
> Your AI thought partner for high-stakes moments in work, relationships, and life.

**Landing Page Copy:**

**Hero:**
> Pause before you react. See your blind spots. Respond from your best self.

**Subhead:**
> Mora helps you navigate high-stakes moments—tense conversations, tough decisions, recurring patterns—with AI that remembers YOUR history.

**Social Proof:**
> Join 500+ people learning to respond from wisdom, not reactivity.

---

## Go-to-Market Implications

### Distribution Channels

**Before (Relationship-Only):**
- Reddit: r/relationships, r/attachment_theory
- Therapist referrals (narrow)
- Instagram/TikTok relationship content creators

**After (Broad):**
- Reddit: r/relationships, r/careerguidance, r/productivity, r/managers, r/journaling
- LinkedIn thought leadership (work decisions)
- YouTube personal development channels
- SEO: "How to respond when...", "Should I quit my job?", "How to set boundaries..."

### Content Strategy

**Before:**
- 100% relationship-focused articles
- "How to respond when partner says..."

**After:**
- 40% relationship
- 30% workplace
- 30% life decisions/personal growth

**Example Topics:**
- "How to respond when your partner says you're being defensive"
- "What to say when your manager gives unfair feedback"
- "Should I quit my job? How to decide with less anxiety"
- "How to set boundaries with demanding parents"
- "Breaking patterns: Why you keep having the same conflicts"

### Pricing Strategy

**No Change:**
- Free: 10 entries/month, 30-day history
- Plus: $12/mo, unlimited entries, pattern insights
- Pro: $25/mo, full history, domaindocs, advisor sharing

**Rationale:**
- "$12/mo thought partner" feels MORE reasonable than "$12/mo relationship coach"
- Comparable to: Notion ($10/mo), Day One ($35/yr), therapy ($150/session)

---

## Risks & Mitigations

### Risk 1: Diluted Positioning
**Symptom:** "For everything" means "for nothing"

**Mitigation:**
- Lead with ONE clear use case: "Pause before you respond"
- Three specific entry points (conflict, patterns, decisions)
- User testimonials focus on specific outcomes

### Risk 2: Complexity Overload
**Symptom:** Users confused by "work AND life AND decisions"

**Mitigation:**
- Onboarding asks: "What brings you here today?" (self-select use case)
- UI adapts: If they paste Slack → workplace UX, if journal → general UX
- Progressive disclosure: Don't show all features at once

### Risk 3: Loss of Relationship Focus
**Symptom:** Original relationship use case (strongest pain) gets neglected

**Mitigation:**
- Relationship features remain core (Unpack, drafts, playbooks)
- Just expand to OTHER high-stakes moments too
- Marketing can still target relationship pain ("Navigate tense conversations")

### Risk 4: Competitive Landscape Shift
**Symptom:** Now competing with Notion AI, Day One, etc. (broader set of competitors)

**Mitigation:**
- Differentiation: Memory system (MIRA) + Privacy (E2E)
- Position as "AI + memory" not "journaling app with AI"
- Focus on high-stakes moments (not general productivity)

---

## Success Metrics

### Leading Indicators (Months 1-3)

**Validate Positioning:**
- Landing page conversion (email signup): 3-5%
- Ad click-through rate: 2-3%
- User interviews: "Thought partner" resonates vs "relationship tool"

**Validate Use Cases:**
- % users who paste conversations (conflict use case): 40%+
- % users who free-form journal (pattern use case): 40%+
- % users who write about decisions (decision use case): 20%+

### Lagging Indicators (Months 4-12)

**Engagement:**
- Day 7 retention: 40%+ (habit-forming)
- Entries per week: 3-5 (active engagement)

**Monetization:**
- Free → Plus conversion: 5-10%
- Plus → Pro upgrade: 10-15%

**Qualitative:**
- NPS: 50+ (word-of-mouth growth)
- User testimonial: "I make better decisions now"

---

## Review Cadence

**3-Month Checkpoint:**
- Do users understand "thought partner" positioning?
- Which use case drives most signups? (conflict, patterns, decisions)
- Is retention comparable across use cases or does one dominate?

**6-Month Checkpoint:**
- Is TAM assumption valid? (Are we getting non-relationship users?)
- Is content marketing working? (SEO traffic growing?)
- Do we need to narrow positioning? (If one use case dominates, lean into it)

**12-Month Checkpoint:**
- Should we rebrand as "Mora for Work" or "Mora for Life"?
- Is B2B2C (therapist partnerships) working?
- Is enterprise (manager use case) viable?

---

## Alternatives Considered

### Alternative 1: "Journal with Perfect Memory"

**Positioning:** Notion/Obsidian alternative with AI memory

**Why Rejected:**
- Competes directly with established players (Notion, Obsidian, Roam)
- "Journaling" feels lower urgency than "high-stakes moments"
- Harder to monetize ($10/mo ceiling vs $25/mo for thought partner)

### Alternative 2: "Fear → Care" (Attachment Theory Focus)

**Positioning:** Move from "Fear of Losing" to "Fear of Hurting"

**Why Rejected:**
- Too clinical, requires explaining attachment theory
- Narrow audience (anxious-preoccupied only)
- Stigma: "I'm anxiously attached" harder to admit

---

## References

- [VISION.md](../design/VISION.md)
- Strategic Analysis (January 2026 conversation)
- [SPEC-006: MIRA-OSS Integration](../specs/SPEC-006-mira-oss-integration.spec.md)
