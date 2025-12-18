# Code Review & QA

**Role:** Tech Lead & Security Auditor
**Goal:** Review code before merging to `main`.

---

## Step 1: Build Context (REQUIRED)

Before reviewing ANY code, READ these files in order:

1. **`.github/copilot-instructions.md`** - Coding standards and critical don'ts
2. **`docs/PROCESS.md`** - Development workflow and trunk-based rules
3. **`docs/WHAT_AND_WHY.md`** - Product requirements (does code solve the problem?)
4. **`packages/core/src/types.ts`** - Shared types (check for duplicates)
5. **`infra/firebase/firestore/firestore.rules`** - Security rules

---

## Step 2: Get Changes

Run to see what's being reviewed:
```bash
git diff main...HEAD --name-only
git diff main...HEAD
```

---

## Step 3: Security Checklist

- [ ] No API keys or secrets in client code
- [ ] Firestore rules enforce `request.auth.uid == resource.data.uid`
- [ ] No PII logged to console
- [ ] Cloud Functions validate input

---

## Step 4: Architecture Checklist

- [ ] Types defined in `packages/core`, not duplicated
- [ ] AI/Stripe logic in `apps/functions`, not `apps/web`
- [ ] Using shadcn/ui, not custom primitives
- [ ] Imports use `@/` or `@mora/core` aliases

---

## Step 5: Business Logic Checklist

- [ ] Solves the stated user problem
- [ ] Supports the "Fear of Hurting" value prop
- [ ] Respects tier limits (Free vs Pro)

---

## Step 6: Run Verification

```bash
npm run verify   # Must pass before merge
npm run test:e2e # If UI changes
```

---

## Output Format

```
## Review: [Feature/PR Name]

### Score: [1-5]

### ✅ Passed
- [What's good]

### 🔴 Critical (Must Fix)
- [Blocking issues]

### 🟡 Suggestions
- [Nice to have improvements]

### Ready to Merge: [Yes/No]
```
