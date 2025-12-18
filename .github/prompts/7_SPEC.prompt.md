---
description: 'Generate a formal specification document before implementation'
agent: 'agent'
tools: ['codebase', 'search', 'fetch']
---

# Specification Generator

**Role:** Technical Specification Writer
**Goal:** Create a formal specification document before implementation.

---

## Step 1: Build Context (REQUIRED)

Before writing ANY specification, READ these files:

1. **`docs/WHAT_AND_WHY.md`** - Product requirements
2. **`docs/STACK.md`** - Technical constraints
3. **`packages/core/src/types.ts`** - Existing data models
4. **`.github/copilot-instructions.md`** - Architecture principles

---

## Step 2: Gather Requirements

For the requested feature:

1. **User Story:** Who benefits and how?
2. **Acceptance Criteria:** What defines "done"?
3. **Constraints:** What can't change?
4. **Dependencies:** What does this rely on?

---

## Step 3: Research Existing Patterns

Search the codebase for:
- Similar features already implemented
- Existing types that can be reused
- Patterns to follow for consistency

---

## Step 4: Write Specification

Use this template:

```markdown
# Specification: [Feature Name]

## 1. Purpose & Scope

**Purpose:** [What this feature does]
**Scope:** [What's included and excluded]
**Target User:** Anxious-Preoccupied partner

## 2. Definitions

| Term | Definition |
|------|------------|
| [Term] | [Definition] |

## 3. Requirements

### Functional Requirements
- **REQ-001:** [User can...]
- **REQ-002:** [System shall...]

### Non-Functional Requirements
- **NFR-001:** [Performance: ...]
- **NFR-002:** [Security: ...]

### Constraints
- **CON-001:** [Must use existing type X]
- **CON-002:** [Cannot modify collection Y]

## 4. Data Model

\`\`\`typescript
// Add to packages/core/src/types.ts
export interface NewFeatureType {
  schemaVersion: 1;
  // fields...
}
\`\`\`

**Firestore Path:** `collection/{docId}`

## 5. API Design

| Function | Trigger | Input | Output |
|----------|---------|-------|--------|
| `functionName` | HTTP/onCall | `{...}` | `{...}` |

## 6. UI Components

- `apps/web/src/app/[route]/page.tsx` - Page component
- `apps/web/src/components/[name].tsx` - UI component

## 7. Security

- **Rule:** `allow read if request.auth.uid == resource.data.uid`
- **Auth Required:** Yes/No
- **PII Handling:** [How sensitive data is handled]

## 8. Acceptance Criteria

- [ ] User can [action]
- [ ] Data persists to [collection]
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Security rules deployed

## 9. Out of Scope

- [What we're NOT building]
- [Future considerations]
```

---

## Step 5: Save Specification

Save the specification to:
```
docs/specs/[feature-name].spec.md
```

---

## Output

Generate the complete specification document ready for implementation.
