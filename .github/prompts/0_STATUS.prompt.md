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
2. **`bd` queue** - Current priorities and blockers (`bd ready`, `bd blocked`, `bd show <id>`, `bd stats`)
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
- **Current priority:** The top item from `bd ready` (or the claimed `in_progress` issue)
- **Blockers:** Anything preventing progress

---

## Output Format

```
## Status: [DATE]

### ✅ Complete
- [Recently closed `bd` issues (if any)]

### 🚧 Current Priority
- [Issue ID + title from `bd ready` / `bd list --status=in_progress`]

### 🔴 Blockers
- [Any issues found during verification]

### 📋 Next Action
- [Specific next step to take]
```

---

## Important

 - **DO NOT duplicate the backlog here.** Treat `bd` as the source of truth.
- **DO NOT duplicate the backlog here.** Treat `bd` as the source of truth.
