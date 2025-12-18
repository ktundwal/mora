# Safe vibe coding protocol

This repo uses a **plan → tests → code → verify → PR/merge** loop to keep momentum high without shipping regressions.

## Branching Strategy (Trunk-Based)
We use a simplified trunk-based workflow to ensure `main` is always deployable.

1.  **`main` Branch:**
    *   **Role:** The Source of Truth.
    *   **Protection:** Locked. No direct commits.
    *   **Behavior:** Merging to `main` automatically deploys to the **Dev** environment.
2.  **`feat/*` Branches:**
    *   **Role:** Short-lived feature branches (e.g., `feat/stripe-checkout`, `fix/login-error`).
    *   **Workflow:** Create from `main` -> Code -> PR -> Squash & Merge.
3.  **Production Release:**
    *   **Trigger:** Creating a GitHub Release (e.g., `v1.0.0`).
    *   **Behavior:** Deploys the tagged commit to the **Prod** environment.

## Core loop (per slice)
1) **Intent (2–10 min)**
   - Goal
   - Non-goals
   - Risk/rollback
   - Data touched (Firestore/Storage/Auth)

2) **Design + plan (no coding yet)**
   - Inputs/outputs
   - Data model + `schemaVersion`
   - Failure modes
   - Telemetry (what proves it works)
   - Smallest shippable slice

3) **Write tests first (TDD)**
   - **Unit tests (Vitest):** Pure logic, parsers, utilities, stores
   - **E2E tests (Playwright):** Critical user journeys (auth, paste flow, etc.)
   - **When to skip:** Rapid prototyping phase - but add tests before PR merge

   ```bash
   # Run unit tests in watch mode while developing
   npm run test:unit:watch
   
   # Run E2E tests
   npm run test:e2e
   ```

4) **Make the test fail (red)**
   - If the test passes before you write code, the test is wrong

5) **Write the minimum code to pass (green)**
   - Don't gold-plate. Just make it work.

6) **Refactor with tests guarding behavior**
   - Now you can clean up, knowing tests will catch regressions

7) **Verify locally**: `npm run verify`

Note: on a new machine, run `npm run setup` once to install Playwright browsers.
8) **PR**: small diff, checklist complete, CI green
9) **Merge + deploy** (dev first; prod gated)
10) **Observe + rollback plan ready**

## Pragmatic TDD (The Real Rule)
- **Ideal:** Write test first, then code
- **Acceptable:** Write code first during exploration, but add test before PR merge
- **Not Acceptable:** Merge without any test coverage for the change

At minimum: every PR should have at least one test that would fail without the change.

## Definition of Done (per PR)
- Intent/plan captured (in PR description or a short doc)
- Tests added/updated; at least one test would fail without the change
- `lint`, `typecheck`, `build`, `test:unit`, `test:e2e` pass (locally or in CI)
- No secrets added; no PII in logs
- Rollback path stated (revert/flag)
- If data touched: per-user authorization maintained (`uid` scoping + rules)

## Guardrails
- Prefer small PRs (one slice)
- Avoid opportunistic refactors during vibe mode
- Schema changes follow expand/contract; migrations are idempotent
- Dev/prod separation: deploy dev by default; prod requires environment approval

## AI Agent Recovery Protocol
If using AI coding assistants (Copilot, Claude, Cursor) and getting stuck:

1. **Stop the spiral.** If you've tried the same fix 3+ times, pause.
2. **Compare to last working state:**
   - `git diff HEAD~1` or compare to last green commit
   - Identify what changed that broke things
3. **Revert and retry:**
   - `git stash` or `git checkout .` to reset
   - Re-approach with a smaller change
4. **Explain the problem fresh:**
   - Start a new chat/context
   - State: "Last working commit was X. I tried Y. Build fails with Z."
5. **Escape hatch:** If build is broken and you can't recover in 15 min:
   - `git reset --hard HEAD~1` (nuclear option)
   - Re-apply changes incrementally with verification between each step

---

## GitHub Copilot Agents & Prompts

This repo includes custom agents and prompts in `.github/` that streamline the development workflow.

### Quick Reference Card

| When you want to... | Use | Location |
|---------------------|-----|----------|
| **Plan without coding** | `@plan-mode` | `.github/agents/plan-mode.agent.md` |
| **Write formal spec** | `/7_SPEC` | `.github/prompts/7_SPEC.prompt.md` |
| **Design architecture** | `/2_ARCHITECT` | `.github/prompts/2_ARCHITECT.prompt.md` |
| **Implement features** | `@mora-dev` | `.github/agents/mora-dev.agent.md` |
| **Review code** | `@reviewer` | `.github/agents/reviewer.agent.md` |
| **Run E2E tests** | `@e2e-tester` or `/6_TEST_E2E` | `.github/agents/e2e-tester.agent.md` |
| **Look up library docs** | `@docs-expert` | `.github/agents/docs-expert.agent.md` |
| **Deploy** | `/5_DEPLOY` | `.github/prompts/5_DEPLOY.prompt.md` |
| **Check progress** | `/0_STATUS` | `.github/prompts/0_STATUS.prompt.md` |

### Feature Development Workflow

The recommended workflow for implementing a new feature:

```
1. @plan-mode    → Analyze and plan (no code written)
2. /7_SPEC       → Generate formal specification  
3. /2_ARCHITECT  → Design data model and components
4. @mora-dev     → Implement with Vibe Protocol (test-first)
5. @reviewer     → Review before committing
6. /0_STATUS     → Update progress tracking
```

### Step-by-Step Example: Implementing a Feature

**Step 1: Start with `@plan-mode`**

In VS Code Chat, type:
```
@plan-mode I need to implement [feature name]. Analyze the codebase and create a plan.
```

What Plan Mode does:
- Reads `docs/WHAT_AND_WHY.md` and `docs/NEXT_STEPS.md`
- Searches codebase for existing patterns
- Validates against business goals (revenue, target user)
- Outputs a structured plan WITHOUT writing code
- Has a "handoff" button to switch to implementation

**Step 2: Generate Specification with `/7_SPEC`**
```
/7_SPEC Create a specification for [feature name]
```

Output: Formal requirements, data model, API design, acceptance criteria.
Saved to: `docs/specs/[feature-name].spec.md`

**Step 3: Design Architecture with `/2_ARCHITECT`**
```
/2_ARCHITECT Design [feature name] based on the spec
```

Output: TypeScript interfaces, Firestore schema, component hierarchy.

**Step 4: Implement with `@mora-dev`**
```
@mora-dev Implement [component] following the spec. Start with test-first approach.
```

What Mora Dev does:
- Follows Plan → Test → Code → Verify loop
- Writes failing test first
- Implements minimum code to pass
- Runs `npm run verify`
- Challenges scope creep and bad patterns

**Step 5: Review with `@reviewer`**
```
@reviewer Review the [feature name] implementation
```

What Reviewer does:
- Runs `git diff` to see changes
- Security checklist (no secrets, proper auth)
- Architecture checklist (types in core, proper imports)
- Gives score and "Ready to Merge" verdict

**Step 6: Update Status with `/0_STATUS`**
```
/0_STATUS
```

Output: Current progress, next priority, any blockers.

### All Available Prompts

| # | Prompt | Purpose |
|---|--------|---------|
| 0 | `/0_STATUS` | Check project status and next priorities |
| 1 | `/1_PLAN` | Turn feature idea into execution plan |
| 2 | `/2_ARCHITECT` | Design data models, APIs, components |
| 3 | `/3_CODE` | Implement with Vibe Protocol |
| 4 | `/4_REVIEW` | Code review checklist |
| 5 | `/5_DEPLOY` | Deploy to dev or production |
| 6 | `/6_TEST_E2E` | Run and debug Playwright tests |
| 7 | `/7_SPEC` | Generate formal specification |
| 8 | `/8_README` | Generate/update README |

### All Available Agents

| Agent | Purpose | Key Capability |
|-------|---------|----------------|
| `@mora-dev` | Main development assistant | Product gatekeeper, challenges bad ideas |
| `@plan-mode` | Strategic planning | No-code analysis, handoff to implementation |
| `@reviewer` | Code review & security | Checklists, verification |
| `@e2e-tester` | Browser testing | Playwright MCP integration |
| `@docs-expert` | Library documentation | Context7 MCP for live docs |
