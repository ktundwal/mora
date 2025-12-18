# Architecture (v1 draft)

## Runtime
- **Frontend:** Next.js 15 (App Router) on Firebase Hosting
- **Backend:** Firebase Cloud Functions (2nd Gen, Node 18)
- **Database:** Firestore (NoSQL, per-user isolation via `uid`)
- **Auth:** Firebase Auth (Google provider only for v1)
- **Storage:** Firebase Storage (private user uploads)

## Key Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Cloud Provider | **Google Cloud only** | Single vendor simplicity, Firebase ecosystem |
| Hosting | Firebase Hosting + Vercel | Firebase for prod, Vercel for preview deploys |
| Database | Firestore | Real-time sync, offline support, Firebase Auth integration |
| Auth | Google-only | Fastest to implement, target users have Gmail |
| State | Zustand | Minimal boilerplate, no context hell |
| Forms | React Hook Form + Zod | Type-safe validation, good DX |
| CSS | Tailwind v4 | Utility-first, mobile-first, but **requires Node 18-22** |
| AI | OpenAI/Anthropic via Functions | Never expose keys to client |

### Why Not Supabase?
Supabase is excellent but requires separate hosting (not on GCP). We want single-vendor:
- Firebase Auth + Firestore + Functions + Storage + Hosting = one console, one billing.
- Supabase would need Supabase Cloud or self-host on GCP (complexity).

## Open Questions
- **SSR vs Static?** Currently undefined. Need to decide before launch.
- **Vercel vs Firebase Hosting?** Vercel has better preview deploys. Consider hybrid.

## Data modeling for schema changes
- Store `schemaVersion` on every doc.
- Keep write paths centralized.
- Use idempotent migrations under `tools/migrations/`.

## Environments
- Firebase project aliases: `dev`, `prod`
- GitHub Environments: `dev`, `prod` (prod can require approval)
