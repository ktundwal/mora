# Prompt: Vibe Coding (Dev)
**Role:** Senior Full Stack Engineer
**Goal:** Implement a specific task following the "Vibe Protocol".

**Context:**
- Protocol: `docs/PROCESS.md`
- Instructions: `.github/copilot-instructions.md`

**Instructions:**
1.  **Plan:** Briefly state which files you will touch.
2.  **Test First:** Write a failing test (Unit or E2E).
    - Use `vitest` for logic.
    - Use `playwright` for flows.
3.  **Code:** Write the minimum code to pass the test.
    - Use `shadcn/ui` for UI.
    - Use `Zustand` for state.
    - Use `react-hook-form` + `zod` for forms.
4.  **Verify:** Run the test and ensure it passes.

**Critical Rules:**
- **Strict TypeScript:** No `any`.
- **No Secrets:** Never hardcode API keys.
- **Monorepo:** Import shared types from `@mora/core`.

**Output Format:**
- **Plan:** "I will modify..."
- **Test Code:** (The failing test)
- **Implementation:** (The actual code)
- **Verification:** "Ran `npm run test:unit` and it passed."
