# Bootstrap (repeatable setup)

Goal: codify the one-time setup so you can recreate dev/prod environments quickly.

## Prerequisites

### Node.js Version
**Required:** Node.js 18.x or 20.x (LTS recommended: 20.18.0)

> ⚠️ **Node.js 23+ is NOT supported** due to native module compatibility issues with `lightningcss` (used by Tailwind CSS v4).

We recommend using [Volta](https://volta.sh/) for automatic Node version management:
```bash
# Install Volta
curl https://get.volta.sh | bash

# Volta will automatically use Node 20.18.0 (configured in package.json)

# Ensure Volta is on your PATH for every shell
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"
```

Or use nvm:
```bash
nvm install 20
nvm use 20
```

### Quick Start
```bash
# Install dependencies
npm install

# Copy environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/functions/.env.example apps/functions/.env

# Fill in your Firebase config in apps/web/.env.local

# Build and run
npm run build:core   # Build shared types first
npm run dev          # Start development server
```

## What we can automate reliably
Using `gcloud`, `firebase-tools`, and `gh` CLI we can automate:
- Create/verify Firebase project aliases (`dev`, `prod`) in `infra/firebase/.firebaserc` (file is already in repo).
- Enable required Google APIs (where applicable).
- Create a deploy service account and grant deploy roles.
- Create GitHub Environments (`dev`, `prod`).
- Set GitHub secrets (e.g., `FIREBASE_SERVICE_ACCOUNT_JSON`).

## What is NOT fully automatable (or is intentionally manual)
- Billing: some Firebase features require billing; attaching billing accounts may be restricted.
- Domain/Hosting custom domain setup.
- Workload Identity Federation (recommended over JSON keys) requires more setup; we can add later.

## Scripts
- `infra/scripts/bootstrap-all.sh`: orchestrates Firebase + GitHub setup.
- `infra/scripts/bootstrap-firebase.sh`: Firebase project + service account + roles.
- `infra/scripts/bootstrap-github.sh`: GitHub Environments + secrets.

## Recommended approach (today)
- Use **Workload Identity Federation** (WIF) via GitHub OIDC.
- No long-lived JSON keys; nothing to rotate.

## After running bootstrap
1) Update `infra/firebase/.firebaserc` if you changed project IDs.
2) Confirm deploy by running:
   - `npm run build`
   - `firebase deploy --config infra/firebase/firebase.json --project dev`


---

## Deployment Architecture

### Two-Pipeline Model
We use separate CI/CD pipelines for frontend and backend:

| Layer | What | Deploys via | Trigger |
|-------|------|-------------|---------|
| **Frontend** | Next.js app (`apps/web`) | Vercel | Push to `main` (all changes) |
| **Backend** | Firestore rules, indexes, Cloud Functions | GitHub Actions → Firebase | Push to `main` (only `infra/firebase/**` or `apps/functions/**`) |

### Vercel Configuration
- **Team:** `mora-ai`
- **Project:** `mora`
- **Production URL:** https://mora-beta.vercel.app
- **Root Directory:** Repository root (monorepo setup)
- **Build Command:** `npm run build:core && npm run build -w apps/web`
- **Output Directory:** `apps/web/.next`

Config file: `vercel.json` at repo root.

### Environment Variables (Vercel)
Set via `vercel env add <NAME> production`:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`
- `NEXT_PUBLIC_ENV`

> ⚠️ **Important:** When adding env vars via CLI, use `echo -n "value" | vercel env add NAME production` to avoid trailing newlines.

### Firebase Auth: Authorized Domains
Add your Vercel domain to Firebase Auth:
1. Go to Firebase Console → Authentication → Settings
2. Add domain: `mora-beta.vercel.app` (or your custom domain)

### GitHub Actions (Backend Deploy)
- Workflow: `.github/workflows/deploy.yml`
- Auth: Workload Identity Federation (WIF) - no JSON keys
- Path filters: Only runs when `infra/firebase/**` or `apps/functions/**` change
- Deploys: Firestore rules and indexes

### Key Gotchas
1. **Firestore Timestamps:** When reading from Firestore, convert `Timestamp` objects to ISO strings before passing to React components.
2. **Subcollection rules:** Write parent document first (not in batch) so subcollection rules can verify parent ownership.
3. **lightningcss on CI:** If `npm ci` fails on Linux, delete `package-lock.json` and regenerate on Linux or run `npm install` with `--platform=linux`.

---

## Documentation Ownership

| File | Purpose | Update When |
|------|---------|-------------|
| `docs/NEXT_STEPS.md` | Task tracking (done/todo) | Any task completed or added |
| `docs/SETUP.md` | Environment & deployment setup | Infra, config, or tooling changes |
| `docs/WHAT_AND_WHY.md` | Product requirements (PRD) | Feature scope changes |
| `.github/prompts/*.prompt.md` | Workflow runbooks for AI | Process or workflow changes |
| `.github/copilot-instructions.md` | AI context (tech stack, principles) | Fundamental architecture changes only |

**Rule:** Never duplicate information across docs. Each doc has one job. Reference other docs instead of copying.
