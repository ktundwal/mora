# Firebase infra

This folder contains Firebase configuration and rules.

## Project aliases
- `dev`: mora-dev
- `prod`: mora-prod

Update `infra/firebase/.firebaserc` with your real Firebase project IDs.

## Deploy (local)
From repo root:
- `npm run build`
- `npx firebase-tools deploy --config infra/firebase/firebase.json --project dev`

CI/CD will run the same deploy step using GitHub Actions secrets.
