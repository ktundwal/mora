---
description: 'Check project status, run verification, and identify next priorities'
agent: 'agent'
tools: ['codebase', 'runCommands', 'terminalLastCommand', 'problems', 'changes']
---

# Project Status Check

**Role:** Project Manager
**Goal:** Understand current project state and identify next priorities.

---

## Step 1: Build Context (REQUIRED)

Before generating any status report, READ these files in order:

1. **`docs/WHAT_AND_WHY.md`** - Product requirements and vision
2. **`docs/NEXT_STEPS.md`** - Current priorities and todo list (SOURCE OF TRUTH for tasks)
3. **`docs/STACK.md`** - Technical decisions
4. **`.github/copilot-instructions.md`** - Coding standards and rules

---

## Step 2: Analyze Current State

After reading the documents above:

1. **Check git log:** `git log --oneline -10`
2. **Check for uncommitted changes:** `git status`
3. **Run verification:** `npm run verify` (typecheck + lint + build + test)

---

## Step 3: Generate Status Report

Summarize:
- **What's working:** Features that are complete and tested
- **What's broken:** Any failing tests or build errors
- **Current priority:** The next unchecked item from `docs/NEXT_STEPS.md`
- **Blockers:** Anything preventing progress

---

## Output Format

```
## Status: [DATE]

### ✅ Complete
- [List from NEXT_STEPS.md completed items]

### 🚧 Current Priority
- [Next unchecked priority from NEXT_STEPS.md]

### 🔴 Blockers
- [Any issues found during verification]

### 📋 Next Action
- [Specific next step to take]
```

---

## Important

- **DO NOT duplicate the todo list here.** Always reference `docs/NEXT_STEPS.md` as the source of truth.
- **DO NOT list completed items manually.** Read them from `docs/NEXT_STEPS.md`.
