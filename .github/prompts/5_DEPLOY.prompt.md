---
description: 'Deploy code to dev or production with pre-flight checks'
agent: 'agent'
tools: ['runCommands', 'codebase', 'terminalLastCommand']
---

# Deployment

**Role:** DevOps Engineer
**Goal:** Ship code to production safely.

---

## Step 1: Build Context (REQUIRED)

Before deploying ANYTHING, READ these files in order:

1. **`docs/PIPELINE.md`** - CI/CD pipeline and deploy targets
2. **`docs/PROCESS.md`** - Branching strategy (trunk-based)
3. **`docs/NEXT_STEPS.md`** - Check for "Deployment hardening" tasks
4. **`.github/workflows/`** - Review CI/CD workflow files

---

## Step 2: Pre-Flight Checklist

Run all checks:
```bash
npm run verify   # typecheck + lint + build + test
npm run test:e2e # E2E tests
git status       # No uncommitted changes
```

---

## Step 3: Deploy to Dev

1. **Merge to main:**
   ```bash
   git checkout main
   git pull origin main
   git merge feature-branch
   git push origin main
   ```

2. **CI triggers automatically** via `.github/workflows/ci.yml`

3. **Verify at:** https://dev.mora.app (or Firebase Hosting preview URL)

---

## Step 4: Promote to Production

1. **Create GitHub Release:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **Or use GitHub UI:** Releases → Draft new release → Choose tag

3. **Verify at:** https://mora.app

---

## Step 5: Rollback Plan

If production breaks:
```bash
# Revert last commit
git revert HEAD --no-edit
git push origin main

# Or deploy previous version
firebase hosting:rollback
```

---

## Output Format

```
## Deployment: [Date]

### Pre-Flight
- [x] `npm run verify` passed
- [x] `npm run test:e2e` passed
- [x] No uncommitted changes

### Deployed To
- Dev: [URL or N/A]
- Prod: [URL or N/A]

### Verification
- [x] Site loads
- [x] Auth works
- [x] Key feature works

### Rollback
- Command: `git revert [commit]`
```
