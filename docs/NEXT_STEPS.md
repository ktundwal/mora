# TODO

## ✅ Completed

### Node.js Version (Fixed)
- Using Volta with Node 20.18.0 (configured in package.json)

### Code Review Enhancements
- [x] Expanded `@mora/core` types with full data model
- [x] Added `schemaVersion` to all Firestore document types
- [x] Cleaned root `package.json` - moved UI deps to web only
- [x] Created `.env.example` files for both web and functions
- [x] Migrated Cloud Functions to 2nd Gen syntax
- [x] Unified tsconfig inheritance via `tsconfig.base.json`
- [x] Updated app metadata and landing page
- [x] Simplified Firestore rules (sub-collections inherit from parent)

### Deployment (WIF + Vercel)
- [x] Switch GitHub Actions deploy auth to Workload Identity Federation (OIDC)
- [x] Run bootstrap for `dev`: WIF configured for `mora-dev-1`
- [x] GitHub Actions deploys Firestore rules/indexes on push
- [x] Path filters: GH Actions only runs on `infra/firebase/**` or `apps/functions/**` changes
- [x] Vercel deployment configured for Next.js app
- [x] Vercel auto-deploys on push to `main`
- [x] Firebase Auth authorized domain: `mora-beta.vercel.app`

### Priority 1: Core App Foundation ✅
- [x] Firebase Client Init with env-driven config
- [x] Auth Provider with Google sign-in/sign-out
- [x] Auth Guard for protected routes
- [x] Zustand Store with user profile and `isPro` flag

### Priority 2: First Feature Path (MVP Core) ✅
- [x] **Conversation Paste:** 4-step wizard (paste → parse → map speakers → save)
- [x] **Parser Logic:** WhatsApp text parser in `@mora/core` with speaker detection
- [x] **Conversations List:** Display user's conversations at `/conversations`
- [x] **Conversation Detail:** View messages at `/conversations/[id]`
- [x] **Security hardening:** Message size limits, ownership validation, localStorage exclusions

---

### SPEC-002: People Layer (v1)
- [x] Shared types in `@mora/core` (Person/Entry + Conversation.personId)
- [x] Firestore rules for `/people` + `/people/{id}/entries`
- [x] Web services + Zustand stores for People + Entries
- [x] People UI: `/people` list + `/people/[id]` detail with entry capture
- [x] Navigation: add People tab
- [x] New chat import: accept `personId` and link conversation
- [x] Onboarding redirect: `/conversations` → `/people` when no people exist (REQ-ONB-001)
- [x] Link enforcement: redirect to `/conversations/[id]/link` after saving without personId (REQ-LINK-002)
- [x] Delete functionality: Person and Entry deletion with UI
- [x] Unpack/Follow-up placeholders: disabled buttons on entry cards
- [x] E2E tests: 7 tests covering People, Entries, onboarding redirect, link page

### SPEC-003: E2EE Cutover Follow-ups
- [x] Run Firestore wipe before release (breaking change). **Dev wiped via `firebase firestore:delete`. Prod pending.**
- [x] Wire client AI calls to the proxy Function (`proxyChat`). **Decrypted content stays client-side.**
- [x] Expand encryption coverage to artifacts/unpacks/replyDrafts/playbook.
- [x] Settings UX for export/delete/account removal.
- [x] Backend for export/delete/account. **Deferred to prod bootstrap: email delivery, monitoring.**
- [x] Fix "Master encryption key not loaded" race condition by gating data fetches on `cryptoStatus === 'ready'`.

---

## 🚧 In Progress

### Deployment: Prod Environment
- [ ] Run bootstrap for `prod`: `./infra/scripts/bootstrap-all.sh prod`
- [ ] Add `mora-prod` domain to Firebase Auth authorized domains
- [ ] Delete legacy `FIREBASE_SERVICE_ACCOUNT_JSON` secret after WIF verified

---

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

---

## Post-Revenue Features

### Playbook
- [ ] CRUD for playbook entries
- [ ] Insert snippet into reply editor
- [ ] Pro feature: unlimited entries + expert templates

### Video Upload
- [ ] Upload video to Firebase Storage
- [ ] Cloud Function for transcription
- [ ] Per-user storage quota

### Export Bundle
- [ ] Markdown export (Obsidian-compatible)
- [ ] Zip bundle with media
- [ ] Therapist PDF export (Pro feature)

### Voice (V2)
- [ ] Voice notes: dictate an Entry tied to a Person ("walking mode")
- [ ] Voice call uploads: explicit consent checkbox + Storage + transcription Function + per-user quota

---

## ❌ Explicitly NOT v1
- Daily check-ins / appreciation logs
- Video upload / transcription pipeline
- Multi-user shared workspace
- Direct WhatsApp integration
- OCR of on-screen text from reels

---

## Technical Debt
- [ ] Add Admin SDK migration runner under `tools/migrations`
- [ ] Set up Husky + lint-staged for pre-commit hooks
- [ ] Add proper unit tests beyond smoke test
- [ ] Configure preview deploys for PRs
