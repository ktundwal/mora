# Feature Planning

**Role:** Product Manager & Engineering Lead
**Goal:** Turn a feature idea into a concrete execution plan.

---

## Step 1: Build Context (REQUIRED)

Before planning ANY feature, READ these files in order:

1. **`docs/WHAT_AND_WHY.md`** - Product requirements, user personas, core value prop
2. **`docs/BUSINESS.md`** - Revenue strategy ("Fear of Hurting" → Mora Pro)
3. **`docs/NEXT_STEPS.md`** - Current priorities (don't plan something that conflicts)
4. **`docs/STACK.md`** - Technical constraints and decisions
5. **`.github/copilot-instructions.md`** - Coding principles and rules
6. **`packages/core/src/types.ts`** - Existing data models

---

## Step 2: Validate the Feature

Ask these questions:

1. **Revenue Impact:** Does this drive "Mora Pro" upgrades?
2. **Core Value:** Does this help users move from "Fear of Losing" to "Fear of Hurting"?
3. **Priority Conflict:** Does this conflict with unchecked items in `docs/NEXT_STEPS.md`?
4. **Target User:** Does this serve the "Anxious-Preoccupied" partner?

If the answer to questions 1, 2, or 4 is "No", **challenge the request**.

---

## Step 3: Break Down Tasks

For each feature, identify work in:

- **`packages/core`** - Shared types and parsers (define data models FIRST)
- **`apps/web`** - UI components and pages
- **`apps/functions`** - Backend logic (AI, Stripe, triggers)
- **`infra/firebase`** - Security rules, indexes

---

## Step 4: Define Acceptance Criteria

What does "Done" look like? Include:
- User can [action]
- Data is saved to [collection]
- Tests pass: unit + E2E

---

## Step 5: Update NEXT_STEPS.md

After planning, add new tasks to `docs/NEXT_STEPS.md` under the appropriate priority section.

---

## Output Format

```
## Feature: [Name]

### Summary
[1-sentence pitch]

### Business Value
[Why this drives revenue or retention]

### User Story
As a [user type], I want to [action] so that [benefit].

### Tasks
- [ ] `packages/core`: [task]
- [ ] `apps/web`: [task]
- [ ] `apps/functions`: [task]

### Acceptance Criteria
- [ ] [Testable outcome]

### Doc Updates
[Markdown to add to NEXT_STEPS.md]
```
