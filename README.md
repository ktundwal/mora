# mora

Mobile-friendly web app (Firebase-first) for turning conversations into: Unpack, Reply Drafts, and a Playbook.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

## Testing

```bash
# Unit tests
npm run test:unit

# E2E tests (one-liner: starts server + runs tests)
npm run dev & sleep 3 && npm run test:e2e

# All checks before commit
npm run verify
```

## Environment Variables

Copy `.env.example` to `.env.local` (do not commit) and fill in Firebase web config.

## Node Version

Requires Node 18-22. Node 23+ breaks native dependencies.

```bash
# Using Volta (recommended)
volta install node@20
```

## Firebase + Deploy

Firebase configuration and rules live in `infra/firebase/`.
CI/CD deploys on merge to `main` using GitHub Actions.

## Schema Evolution (Firestore)

All persisted documents should include:
- `schemaVersion` (number)
- `createdAt` / `updatedAt` (server timestamps)

Migrations tooling will live in `tools/migrations/`.

