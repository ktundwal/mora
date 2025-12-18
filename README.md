# mora

Mobile-friendly web app (Firebase-first) for turning conversations into: Unpack, Reply Drafts, and a Playbook.

## Local dev

1) Install Node.js (recommend LTS).
2) From repo root:
- `npm install`
- `npm run dev`

## Environment variables

Copy `.env.example` to `.env.local` (do not commit) and fill in Firebase web config.

## Firebase + Deploy (planned)

Firebase configuration and rules live in `infra/firebase/`.
CI/CD will deploy on merge to `main` using GitHub Actions.

## Schema evolution (Firestore)

All persisted documents should include:
- `schemaVersion` (number)
- `createdAt` / `updatedAt` (server timestamps)

Migrations tooling will live in `tools/migrations/`.
