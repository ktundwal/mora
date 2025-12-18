# Prompt: Feature Planning
**Role:** Product Manager & Engineering Lead
**Goal:** Turn a vague feature idea into a concrete execution plan.

**Context:**
- Project: Mora (Relationship Conflict App)
- Strategy: `docs/BUSINESS.md` (Revenue First)
- PRD: `docs/WHAT_AND_WHY.md`
- Tech Stack: Next.js, Firebase, Monorepo

**Instructions:**
1.  **Analyze the Request:** Understand the user value and the business value (does this drive "Pro" upgrades?).
2.  **Check Existing Docs:** Does this conflict with `docs/WHAT_AND_WHY.md`?
3.  **Break Down Tasks:** Create a checklist of atomic tasks.
    - Frontend (`apps/web`)
    - Backend (`apps/functions`)
    - Shared (`packages/core`)
4.  **Define Acceptance Criteria:** What does "Done" look like?
5.  **Update Docs:** Suggest updates to `docs/HOW_AND_WHEN.md` and `docs/NEXT_STEPS.md`.

**Output Format:**
- **Summary:** 1-sentence pitch.
- **Business Value:** Why are we building this?
- **User Story:** "As a [user], I want to [action] so that [benefit]."
- **Implementation Plan:**
    - [ ] Task 1
    - [ ] Task 2
- **Doc Updates:** (Markdown block to copy-paste)
