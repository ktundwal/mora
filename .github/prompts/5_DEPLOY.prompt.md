---
description: 'Deploy to Vercel (frontend) or Firebase (backend)'
agent: 'agent'
tools: ['runCommands', 'codebase', 'terminalLastCommand']
---

# Deployment

**Role:** DevOps Engineer  
**Goal:** Ship code to production safely.

---

## Architecture

| Layer | What | Deploys via | Trigger |
|-------|------|-------------|---------|
| **Frontend** | Next.js (`apps/web`) | Vercel | Auto on push to `main` |
| **Backend** | Firestore rules/indexes, Functions | GitHub Actions | Auto on push (if `infra/firebase/**` or `apps/functions/**` changed) |

---

## Standard Deploy (Push to Main)

Both pipelines auto-trigger on push to `main`:

```bash
# 1. Pre-flight checks
npm run verify   # typecheck + lint + build + test

# 2. Commit and push
git add .
git commit -m "feat: your change"
git push origin main

# 3. Watch deploys
vercel list              # Check Vercel status
gh run list --limit 3    # Check GitHub Actions
```

---

## Force Deploy: Vercel (Frontend)

Use when: Env vars changed, need to redeploy without code changes.

```bash
cd /path/to/mora
vercel --prod
```

Expected output:
```
✅ Production: https://mora-xxx.vercel.app
🔗 Aliased: https://mora-beta.vercel.app
```

---

## Force Deploy: Firebase (Backend)

Use when: Need to deploy rules/indexes outside of CI.

```bash
cd /path/to/mora

# Deploy Firestore rules and indexes
firebase deploy \
  --only firestore:rules,firestore:indexes \
  --project mora-dev-1
```

For Cloud Functions (when ready):
```bash
firebase deploy \
  --only functions \
  --project mora-dev-1
```

---

## Environment Variables (Vercel)

To add/update env vars:

```bash
# Remove old (if exists)
vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY production -y

# Add new (use echo -n to avoid newlines!)
echo -n "your-value" | vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production

# Redeploy to pick up changes
vercel --prod
```

---

## Verify Deployment

### Frontend (Vercel)
```bash
# Check deployment status
vercel list | head -5

# Health check
curl -sI https://mora-beta.vercel.app | head -3
```

### Backend (Firebase)
```bash
# Check deployed rules
firebase firestore:rules:get --project mora-dev-1

# Check GitHub Actions run
gh run list --limit 3
```

---

## Rollback

### Vercel (Frontend)
```bash
# List deployments
vercel list

# Promote previous deployment to production
vercel promote [deployment-url] --prod
```

### Firebase (Firestore Rules)
```bash
# Rules: Redeploy from a previous commit
git checkout HEAD~1 -- infra/firebase/firestore/firestore.rules
firebase deploy --only firestore:rules --project mora-dev-1
```

---

## Troubleshooting

### "Sign in with Google" doesn't work
Add Vercel domain to Firebase Auth authorized domains:
1. Firebase Console → Authentication → Settings → Authorized domains
2. Add: `mora-beta.vercel.app`

### Vercel env var has newline
Symptom: `%0A` in URLs, Firebase errors
```bash
vercel env rm VAR_NAME production -y
echo -n "clean-value" | vercel env add VAR_NAME production
vercel --prod
```

### "Client is offline" / Firestore errors
Check that all `NEXT_PUBLIC_FIREBASE_*` env vars are set correctly in Vercel.

### GitHub Actions not running
Check path filters in `.github/workflows/deploy.yml`. Only triggers on:
- `infra/firebase/**`
- `apps/functions/**`
