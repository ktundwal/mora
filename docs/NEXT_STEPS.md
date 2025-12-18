# TODO

## ⚠️ Immediate: Fix Node.js Version
Your environment is running Node.js 24, which is incompatible with `lightningcss` (Tailwind CSS v4 dependency).

```bash
# Option 1: Volta (recommended - auto-switches per project)
curl https://get.volta.sh | bash
volta install node@20

# Option 2: nvm
nvm install 20 && nvm use 20

# Then reinstall dependencies
npm run clean && npm install
```

## ✅ Completed (Code Review Enhancements)
- [x] Expanded `@mora/core` types with full data model (Artifact, Unpack, ReplyDraft, PlaybookEntry, etc.)
- [x] Added `schemaVersion` to all Firestore document types
- [x] Cleaned root `package.json` - moved UI deps to web only, added proper scripts
- [x] Created `.env.example` files for both web and functions
- [x] Migrated Cloud Functions to 2nd Gen syntax with proper structure
- [x] Added `@mora/core` dependency to functions package
- [x] Unified tsconfig inheritance via `tsconfig.base.json`
- [x] Updated app metadata (title, description, OpenGraph, viewport)
- [x] Replaced boilerplate home page with Mora landing page
- [x] Simplified Firestore rules (sub-collections inherit from parent)
- [x] Updated E2E tests for new landing page

## Deployment hardening (WIF)
- [x] Switch GitHub Actions deploy auth from JSON keys to Workload Identity Federation (OIDC)
- [x] Update bootstrap scripts to configure WIF + GitHub Environment variables
- [ ] Run bootstrap for `dev`: `./infra/scripts/bootstrap-all.sh dev`
- [ ] Run bootstrap for `prod`: `./infra/scripts/bootstrap-all.sh prod`
- [ ] Verify GitHub Actions deploy succeeds for `dev` (push to `main` or `workflow_dispatch`)
- [ ] After a successful WIF deploy, delete legacy secret `FIREBASE_SERVICE_ACCOUNT_JSON` from GitHub Environments (dev/prod)
- [ ] (Optional) Tighten IAM roles beyond `roles/firebase.admin` once deploy surface is stable

## Firebase projects
- [ ] Confirm `infra/firebase/.firebaserc` project IDs are real and billing is attached where required
- [ ] Confirm Firebase Hosting, Firestore, Storage are enabled in both projects

## 🚨 Priority 1: Core App Foundation (This Week)
- [ ] **Firebase Client Init:** Add Firebase client in `apps/web/src/lib/firebase.ts` (env-driven config)
- [ ] **Auth Provider:** Create AuthContext with Google sign-in/sign-out
- [ ] **Auth Guard:** Create protected route wrapper for authenticated pages
- [ ] **Zustand Store:** Set up user store with `isPro` flag

## 🚨 Priority 2: First Feature Path (MVP Core)
- [ ] **Conversation Paste:** Implement "New Conversation" flow (paste → parse → save to Firestore)
- [ ] **Parser Logic:** Create WhatsApp text parser in `@mora/core` (extract speaker, timestamp, message)
- [ ] **Conversations List:** Display user's conversations with search/sort

## 💰 Priority 3: Revenue Path (Mora Pro)
- [ ] **Stripe Setup:** Create Stripe account and set up "Mora Pro" product ($15/mo)
- [ ] **Checkout Flow:** Implement Stripe Checkout in Cloud Functions
- [ ] **Webhook Handler:** Handle subscription events in `stripeWebhook` function
- [ ] **Paywall Logic:** Implement `unpacksUsedThisMonth` counter and gate "Unlimited Unpacks"
- [ ] **Upgrade Button:** Add "Upgrade to Pro" in settings/nav

## Priority 4: AI Integration
- [ ] **Unpack Generation:** Implement `generateUnpack` function with OpenAI/Anthropic
- [ ] **Draft Generation:** Implement reply drafting with tone variants
- [ ] **Therapy Speak Detector:** Flag and suggest alternatives

## Priority 5: Polish & Launch
- [ ] **Export:** Implement Obsidian-compatible Markdown export
- [ ] **Mobile PWA:** Add manifest.json for installable PWA
- [ ] **Error Handling:** Add React Error Boundary and toast notifications

## Milestone 4: Content Features (Post-Revenue)
These are important but not revenue-blocking. Build after M3 proves people pay.

### M4.1: Playbook (Epic H)
- [ ] **CRUD:** Create/list/edit/delete playbook entries
- [ ] **Insert Snippet:** In reply editor, insert playbook entry into draft
- [ ] **Pro Feature:** Unlimited entries + expert templates for Pro users

### M4.2: Video Upload (Epic E2)
- [ ] **Upload Flow:** Upload video file to Firebase Storage (private)
- [ ] **Transcription Pipeline:** Cloud Function to transcribe video → artifact
- [ ] **Storage Limits:** Implement per-user storage quota

### M4.3: Export Bundle (Epic J)
- [ ] **Markdown Export:** One-click Obsidian-compatible export
- [ ] **Zip Bundle:** If media attached, export as .zip with relative links
- [ ] **Therapist PDF:** "Prepare for Session" formatted export (Pro feature)

## ❌ Explicitly NOT v1 (Do After Revenue)
- Daily check-ins / appreciation logs (retention theater)
- Video upload / transcription pipeline
- Multi-user shared workspace
- Direct WhatsApp integration
- OCR of on-screen text from reels

## Technical Debt
- [ ] Add Admin SDK migration runner under `tools/migrations`
- [ ] Set up Husky + lint-staged for pre-commit hooks
- [ ] Add proper unit tests beyond smoke test
- [ ] Configure Next.js output for SSR vs static export decision
- [ ] Evaluate Vercel for preview deploys (better DX than Firebase Hosting)
