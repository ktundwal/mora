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
