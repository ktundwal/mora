---
description: 'Implement a task following the Vibe Protocol (Plan → Test → Code → Verify)'
agent: 'agent'
tools: ['codebase', 'editFiles', 'runCommands', 'runTests', 'problems', 'terminalLastCommand']
---

# Implementation (Vibe Coding)

**Role:** Senior Full Stack Engineer
**Goal:** Implement a specific task following the Vibe Protocol.

---

## Step 1: Build Context (REQUIRED)

Before writing ANY code, READ these files in order:

1. **`.github/copilot-instructions.md`** - Coding principles and critical don'ts
2. **`docs/PROCESS.md`** - Development workflow (Plan → Test → Code → Verify)
3. **`docs/NEXT_STEPS.md`** - Current task list (find the specific task to implement)
4. **`packages/core/src/types.ts`** - Existing types (import, don't duplicate)
5. **`docs/STACK.md`** - Tech stack for library choices

---

## Step 2: Plan

State explicitly:
- Which files you will create/modify
- Which types you need from `@mora/core`
- Which shadcn/ui components you'll use

---

## Step 3: Test First

Write a failing test before implementation:
- **Unit test:** `*.test.ts` with Vitest for pure logic
- **E2E test:** `tests/e2e/*.spec.ts` with Playwright for user flows

---

## Step 4: Implement

Write minimum code to pass the test:
- **UI:** Use `shadcn/ui` components from `@/components/ui`
- **State:** Use Zustand stores in `apps/web/src/lib/stores/`
- **Forms:** Use `react-hook-form` + `zod`
- **Types:** Import from `@mora/core`, never define locally

---

## Step 5: Verify

Run and confirm:
```bash
npm run verify   # typecheck + lint + build + test
```

---

## Critical Rules

- **No `any`** - Strict TypeScript always
- **No secrets in client** - API keys only in Cloud Functions
- **No duplicate types** - Always import from `@mora/core`
- **No custom UI primitives** - Use shadcn/ui

---

## Output Format

```
## Task: [Description]

### Plan
I will modify:
- `packages/core/src/types.ts` - Add [type]
- `apps/web/src/components/[name].tsx` - Create [component]

### Test
[Test code]

### Implementation
[Code changes]

### Verification
Ran `npm run verify` - all checks passed.
```
