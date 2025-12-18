# Project Status Summary

Generate a summary of what has been implemented and what remains to be done in the Mora project.

## What's Been Implemented ✅

### Infrastructure
- [x] Monorepo setup (npm workspaces): `apps/web`, `apps/functions`, `packages/core`
- [x] Node version pinned to 18-22 via Volta
- [x] TypeScript with shared base config
- [x] ESLint + Prettier configured
- [x] Git repo initialized and pushed to GitHub

### Core Types (`packages/core`)
- [x] UserProfile with subscription tier, unpack limits
- [x] Conversation, Message, Artifact types
- [x] Unpack, ReplyDraft, PlaybookEntry types
- [x] Schema versioning on all types
- [x] FREE_TIER_LIMITS and PRO_TIER_LIMITS constants

### Authentication (Priority 1) 
- [x] Firebase client SDK with lazy initialization (SSR-safe)
- [x] Firebase emulator support via env var
- [x] AuthProvider with Google sign-in/sign-out
- [x] AuthGuard component + HOC for protected routes
- [x] Zustand user store with isPro flag and unpack tracking
- [x] Auth test component on landing page
- [x] Google sign-in tested and working

### Web App (`apps/web`)
- [x] Next.js 15 + React 19 + Tailwind v4
- [x] Landing page with Mora branding
- [x] Providers wrapper in root layout
- [x] Environment variables configured (.env.local)

### Cloud Functions (`apps/functions`)
- [x] Migrated to 2nd Gen syntax
- [x] Stub functions: healthCheck, generateUnpack, stripeWebhook, onConversationCreated

### Testing
- [x] Vitest for unit tests (1 smoke test)
- [x] Playwright for E2E tests (3 tests passing)
- [x] Firebase emulator connection support

### Documentation
- [x] README with quick start and test commands
- [x] PRD (WHAT_AND_WHY.md)
- [x] Technical stack decisions (STACK.md)
- [x] Development process (PROCESS.md)
- [x] Deployment pipeline (PIPELINE.md)
- [x] Copilot instructions with project rules
- [x] Prompts for various workflows

### CI/CD
- [x] GitHub Actions workflows (ci.yml, deploy.yml)
- [x] Firestore security rules

---

## What's Remaining 🚧

### Priority 2: First Feature Path (MVP Core)
- [ ] **Conversation Paste:** "New Conversation" flow (paste → parse → save)
- [ ] **Parser Logic:** WhatsApp text parser in `@mora/core`
- [ ] **Conversations List:** Display user's conversations with search/sort
- [ ] **Dashboard page:** Post-login home with conversations

### Priority 3: Revenue Path (Mora Pro)
- [ ] **Stripe Setup:** Create product ($15/mo)
- [ ] **Checkout Flow:** Stripe Checkout in Cloud Functions
- [ ] **Webhook Handler:** Handle subscription events
- [ ] **Paywall Logic:** Unpack counter and gating
- [ ] **Upgrade Button:** In settings/nav

### Priority 4: Core AI Features
- [ ] **Unpack Feature:** AI analysis of conversation
- [ ] **Reply Drafts:** AI-generated response suggestions
- [ ] **OpenAI/Anthropic Integration:** In Cloud Functions

### Priority 5: Polish & Launch
- [ ] **Playbook:** Pattern tracking across conversations
- [ ] **Export:** PDF/share functionality
- [ ] **Video Upload:** Reel transcript extraction
- [ ] **Mobile Optimization:** PWA features

### Infrastructure Remaining
- [ ] Run bootstrap scripts for Firebase projects
- [ ] Verify GitHub Actions deploy succeeds
- [ ] Set up Vercel for preview deploys
- [ ] Delete legacy secrets after WIF works

---

## Quick Commands

```bash
# Dev server
npm run dev

# All checks
npm run verify

# E2E tests
npm run dev & sleep 3 && npm run test:e2e
```

## Git Log (Recent)
```
5b5d62d fix: rename prompts to .prompt.md
35f5cab docs: add E2E test prompt
a72eadf feat: add Firebase emulator support
fc5b2f1 feat: add auth test component
8f6f989 feat: add Firebase auth, Zustand store (Priority 1)
7f20bc3 fix: allow Node 18-22
82c5531 chore: initial scaffold for Mora
```
