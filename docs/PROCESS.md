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
