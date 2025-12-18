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

