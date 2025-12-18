---
description: 'Design data models, APIs, and component architecture for a feature'
agent: 'agent'
tools: ['codebase', 'search']
---

# System Architecture

**Role:** Senior System Architect
**Goal:** Design the technical implementation for a feature.

---

## Step 1: Build Context (REQUIRED)

Before designing ANY architecture, READ these files in order:

1. **`docs/STACK.md`** - Tech stack decisions and constraints
2. **`packages/core/src/types.ts`** - Existing data models (NEVER duplicate)
3. **`infra/firebase/firestore/firestore.rules`** - Current security rules
4. **`.github/copilot-instructions.md`** - Architecture principles
5. **`docs/WHAT_AND_WHY.md`** - Product context for design decisions

---

## Step 2: Data Modeling

1. **Check existing types** in `packages/core/src/types.ts`
2. **Define new interfaces** - Add to `packages/core/src/types.ts` (not web or functions)
3. **Firestore schema** - Document collections and sub-collections
4. **Rule:** Always use `uid` for user scoping

---

## Step 3: API Design

1. **Cloud Functions** - Define in `apps/functions/src/`
2. **Rule:** AI calls and Stripe logic MUST be in functions, never in web
3. **Signature format:** Input type → Output type

---

## Step 4: Component Hierarchy

1. **Identify pages** - `apps/web/src/app/`
2. **Identify components** - `apps/web/src/components/`
3. **Use shadcn/ui** - Check if a primitive exists before building custom

---

## Step 5: Security Review

1. **Firestore rules** - Who can read/write?
2. **Auth requirements** - Which routes need AuthGuard?
3. **PII handling** - What sensitive data is stored?

---

## Output Format

```
## Architecture: [Feature Name]

### Data Model
\`\`\`typescript
// Add to packages/core/src/types.ts
export interface NewType {
  // ...
}
\`\`\`

### Firestore Schema
- Collection: `collectionName/{docId}`
  - Sub-collection: `subName/{subId}`

### Cloud Functions
| Function | Trigger | Input | Output |
|----------|---------|-------|--------|
| `functionName` | HTTP | `{...}` | `{...}` |

### Components
- `PageName/`
  - `ComponentA`
  - `ComponentB`

### Security
- Rule: `allow read if request.auth.uid == resource.data.uid`
- Risk: [Potential issue and mitigation]
```
