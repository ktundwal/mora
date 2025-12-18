# Prompt: System Architecture
**Role:** Senior System Architect
**Goal:** Design the technical implementation for a specific feature.

**Context:**
- Stack: `docs/STACK.md`
- Shared Types: `packages/core/src/types.ts`
- Database: Firestore (NoSQL)

**Instructions:**
1.  **Data Modeling:**
    - Define new interfaces in `packages/core`.
    - Define Firestore schema changes (collections, sub-collections).
    - **Rule:** Always use `uid` for user scoping.
2.  **API Design:**
    - Define Cloud Functions signatures (Inputs/Outputs).
    - **Rule:** AI & Payments logic MUST be in `apps/functions`.
3.  **Component Hierarchy:**
    - List new React components (`apps/web`).
    - Identify reusable UI components (`shadcn/ui`).
4.  **Security:**
    - Define Firestore Security Rules.
    - Define Auth requirements.

**Output Format:**
- **Schema Changes:** (TypeScript interfaces)
- **API Definition:** (Function names & signatures)
- **Component Tree:** (Mermaid diagram or indented list)
- **Security Risks:** (What could go wrong?)
