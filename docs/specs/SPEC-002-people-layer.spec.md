# Specification: People (1:1 Relationships) + In-the-moment Capture + Unpack + Follow-up

**Document ID:** SPEC-002  
**Created:** December 19, 2025  
**Status:** Draft  

---

## 1. Purpose & Scope

**Purpose:** Add a “people layer” so a user can capture and strengthen multiple 1:1 relationships across work and life (and optionally self-reflection), then generate Unpacks and Follow-ups using accumulated context.

**Scope (v1):**
- ✅ Create and manage **People** (who the user has 1:1 relationships with)
- ✅ Day-1 onboarding to add a few People fast
- ✅ Capture **Entries** (in-the-moment interaction logs + brain dumps) per Person
- ✅ Link imported Conversations (existing paste flow) to a Person
- ✅ Generate **Unpack** and **Follow-up** from a Person screen (async)

**Explicitly NOT in v1:**
- ❌ Compatibility scores / relationship report cards / matchmaking
- ❌ Personality labeling / clinical labels / diagnosis
- ❌ Direct integrations (WhatsApp/IG/Slack/email APIs)

**Target user:** A whole person navigating work and life who needs fast clarity and safer words during relationship-critical moments.

**Success metrics:**
- Day 1: user creates ≥2 People and captures ≥1 Entry in < 2 minutes.
- Week 1: user generates ≥1 Follow-up from a Person screen.

---

## 2. Naming & UX Labels

**UI label recommendation:** **People**
- Rationale: broad enough for spouse/work/parents/kids; avoids the ambiguity of “Partner” (works socially for spouse/work but breaks for kids).

**Entity name (internal):** `Person` (or `Counterpart`)
- In UI, avoid “Counterpart” terminology.

**Optional future label (marketing copy):** “People who matter”
- Use as a tagline/subheader, not a nav label.

---

## 3. Definitions

| Term | Definition |
|------|------------|
| **Person** | A single 1:1 relationship target (manager, spouse, parent, child, friend, mentor, etc.) |
| **Relationship Type** | A quick categorical label used during onboarding and templates |
| **Entry** | A user-captured log (interaction, brain dump, note) tied to a Person (or Self) |
| **Unpack** | AI-generated structured understanding grounded in linked context |
| **Follow-up** | AI-generated “what to say/do next” drafts + optional next action |

---

## 4. Requirements

### 4.1 Onboarding (Day 1)

| ID | Requirement |
|----|-------------|
| **REQ-ONB-001** | First session prompts user to add People (min 1) |
| **REQ-ONB-002** | Onboarding supports adding multiple People quickly (e.g., add 3 now / skip) |
| **REQ-ONB-003** | Person creation requires: name + relationship type |
| **REQ-ONB-004** | User can optionally attach initial context via: (a) import conversation (existing flow), or (b) write a short note |
| **REQ-ONB-005** | Import/upload requires a permission checkbox: “I have the right/permission to upload and process this content.” |

### 4.2 Relationship Types (v1 list)

Relationship type is selected during onboarding and can be edited later.

**v1 enums (initial):**
- `self` (special)
- `manager`
- `direct_report`
- `peer`
- `mentor`
- `role_model`
- `friend`
- `spouse_wife`
- `spouse_husband`
- `partner` (gender-neutral romantic)
- `father`
- `mother`
- `child`
- `other`

Notes:
- Keep `other` always available.
- It’s OK to include both `spouse_wife`/`spouse_husband` and `partner` because the user’s mental model matters.

### 4.3 “Self” journaling

| ID | Requirement |
|----|-------------|
| **REQ-SELF-001** | User can create/select **Self** as a Person (`relationshipType=self`) |
| **REQ-SELF-002** | Self supports the same Entry capture as other People |

Rationale: avoids “Unknown” and supports quick self-reflection as part of the “whole person across work + life” thesis.

### 4.4 In-the-moment capture (Entries)

| ID | Requirement |
|----|-------------|
| **REQ-CAP-001** | User can select a Person and create a new Entry in < 30 seconds on mobile |
| **REQ-CAP-002** | Entry supports 3 types: `interaction`, `brain_dump`, `note` |
| **REQ-CAP-003** | Interaction Entry has fields: “What they said” and “What I said” (optional but encouraged) |
| **REQ-CAP-004** | Brain dump is a single freeform textarea |
| **REQ-CAP-005** | Entry includes “Why I’m logging this” (small enum set) |
| **REQ-CAP-006** | Entry can optionally include pasted text (email excerpt, DM transcript, IG reel transcript text). No automation required |
| **REQ-CAP-007** | Entries are time-stamped and show in a Person timeline |

**“Why I’m logging this” enum (v1):**
- `dont_know_how_to_respond`
- `feeling_activated`
- `i_think_i_hurt_them`
- `need_to_set_boundary`
- `trying_to_repair`
- `saving_for_later`

### 4.5 Link existing Conversation import to a Person

| ID | Requirement |
|----|-------------|
| **REQ-LINK-001** | When creating a new Conversation (paste flow), user can select a Person to link it to |
| **REQ-LINK-002** | If no Person is selected, system prompts to choose/create one before final save (but user can choose “Self” or “Other/Unassigned” if needed) |

v1 recommendation: allow an explicit `unassigned` state only if needed for migration/back-compat; default behavior should encourage linking.

### 4.6 Unpack (per Person)

| ID | Requirement |
|----|-------------|
| **REQ-UNP-001** | From a Person screen, user can generate an Unpack |
| **REQ-UNP-002** | Unpack uses: Person profile notes + recent Entries + linked Conversations + linked Artifacts |
| **REQ-UNP-003** | Unpack must be grounded in provided text only; assumptions must be explicit |
| **REQ-UNP-004** | Output avoids therapy-speak and avoids labels/diagnosis |
| **REQ-UNP-005** | Runs async with status: queued → running → complete → failed |

**Context selection (v1):**
- Default input window: last 14 days of Entries + last N messages across linked Conversations (e.g., 300–500), plus the Person profile.
- Pro can widen the window (aligns with “strengthen existing relationships over time”).

### 4.7 Follow-up help (per Person)

| ID | Requirement |
|----|-------------|
| **REQ-FUP-001** | User can request follow-up help from Person screen and immediately after saving an Entry |
| **REQ-FUP-002** | System generates 2–3 short drafts + optional “next action” (when appropriate) |
| **REQ-FUP-003** | Drafts must match user tone and must not read AI-authored; user edits before sending |
| **REQ-FUP-004** | Include risk flags: defensive, ledger language, reassurance spiral, tone policing |
| **REQ-FUP-005** | Runs async; outputs are saved and re-openable |

---

## 5. Data Model (conceptual)

> Implementation detail: Types must be defined in `packages/core/src/types.ts` before use in web/functions.

### New entities

**Person**
- `id`, `uid`
- `displayName`
- `relationshipType` (enum above)
- `importanceNote` (optional)
- `profileNotes` (optional, from user POV)
- timestamps + `schemaVersion`

**Entry**
- `id`, `uid`, `personId`
- `type`: `interaction` | `brain_dump` | `note`
- `why`: enum above
- `whatTheySaid` (optional)
- `whatISaid` (optional)
- `content` (optional)
- `createdAt`, `updatedAt`, `schemaVersion`

### Link existing entities

- `Conversation` should include `personId` (nullable during migration; required for new conversations once enabled).
- `Artifact` can remain tied to `Conversation` in v1; optionally add `personId` later if needed.
- `Unpack` and `ReplyDraft` should be linkable to `personId` so “per person” works even when the trigger is an Entry, not a pasted conversation.

---

## 6. UX / Screens (v1)

### Routes
- `/people` — list of People
- `/people/[id]` — Person detail
  - Profile section
  - Timeline (Conversations + Entries)
  - Actions: “Unpack” and “Follow-up”
- `/new`
  - New Conversation import (existing)
  - New Entry (new)

### Person detail timeline ordering
- Reverse chronological, grouped by day
- Entry cards show: type + “why” + short preview

---

## 7. AI execution principles (must match PRD)

- AI calls only in Cloud Functions
- Structured outputs; explicit assumptions
- No compatibility scoring, no personality labeling, no diagnosis
- Co-authoring: drafts are short, editable, and prompt user to add one true specific detail to preserve sincerity

---

## 8. Acceptance Criteria (v1)

- User can:
  - create a Person during onboarding
  - optionally create/select **Self**
  - import a conversation and link it to a Person
  - create an Entry for a Person in < 30 seconds on mobile
  - generate an Unpack for a Person
  - generate Follow-up drafts from (a) Person screen and (b) immediately after an Entry
- The product never shows compatibility scores, report cards, or matchmaking suggestions.
