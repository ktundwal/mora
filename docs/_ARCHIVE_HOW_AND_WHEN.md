# V1 Build Checklist — Firebase Web App

Date: Dec 18, 2025
Source PRD: WHAT_AND_WHY.md

This is an execution checklist (epics → stories → acceptance criteria) to build v1 without scope creep.

## Epic A — Repo, CI/CD, environments
### A1) GitHub repository + branching
- Create repo, protect `main`, require PR checks.

Acceptance criteria:
- `main` is protected; PR required; status checks required.

### A2) CI checks on PR
- Add GitHub Actions workflow to run:
  - install
  - lint
  - typecheck
  - unit tests (if present)
  - build

Acceptance criteria:
- PR fails if lint/typecheck/build fails.

### A3) Firebase project + deployment pipeline
- Create Firebase project(s): `dev` and `prod` (recommended) OR just `prod` if minimal.
- Add GitHub Actions deploy on merge to `main`.

Acceptance criteria:
- Merge to `main` triggers deploy to Firebase Hosting + backend (Functions/Run) successfully.

### A4) Secrets management
- Configure GitHub Actions secrets for Firebase deploy token / service account.

Acceptance criteria:
- No secrets committed in repo; deploy succeeds using Actions secrets.

## Epic B — Authentication & user isolation
### B1) Google sign-in
- Implement Firebase Auth Google provider.

Acceptance criteria:
- Unauthenticated users are redirected to sign-in.
- Signed-in users can sign out.

### B2) Firestore security rules
- Create `users/{uid}` and enforce per-user access.

Acceptance criteria:
- A user cannot read/write another user’s documents.

### B3) Minimal settings
- Provide settings screen:
  - sign out
  - delete account (hard delete)

Acceptance criteria:
- Delete account removes user-owned Firestore docs and Storage objects (best-effort with background job if needed).

## Epic C — Data model & core CRUD
### C1) Firestore schema (v1)
Collections (suggested):
- `users/{uid}`
- `conversations/{conversationId}`
- `conversations/{conversationId}/messages/{messageId}`
- `conversations/{conversationId}/artifacts/{artifactId}`
- `conversations/{conversationId}/unpacks/{unpackId}`
- `conversations/{conversationId}/replyDrafts/{draftId}`
- `playbookEntries/{entryId}` (scoped to user via `uid` field)

Acceptance criteria:
- Create/read/update/delete works for each entity.

### C2) Local time zone normalization
- Store timestamps in ISO / UTC where possible.
- Display normalized to user local time zone.

Acceptance criteria:
- Same conversation displayed consistently on phone/desktop for the signed-in user.

## Epic D — Conversation ingest (WhatsApp paste/export)
### D1) New conversation: paste flow
- UI: paste raw chat text → parse preview → confirm.
- Parser extracts:
  - speaker labels (Kapil/C2/Unknown)
  - timestamps (nullable)
  - message text

Acceptance criteria:
- Pasting a thread creates a conversation with an ordered list of messages.
- If timestamps cannot be parsed, order is preserved.

### D2) Speaker mapping UI
- Allow user to map detected names to Kapil/C2.
- Allow manual correction per message.

Acceptance criteria:
- User can fix mis-attributed speakers in <1 minute for a typical thread.

### D3) Permission checkbox
- Require user to check “I have the right/permission…” before saving import.

Acceptance criteria:
- Cannot proceed without confirmation.

## Epic E — Artifact ingest (reels)
### E1) Add artifact: transcript paste
- UI: paste transcript + optional URL.

Acceptance criteria:
- Artifact saved and visible under the conversation.

### E2) (Optional v1) Upload video file
- Upload to Firebase Storage.

Acceptance criteria:
- File stored privately; linked to artifact.

## Epic F — Unpack generation (AI)
### F1) Generate Unpack job
- Trigger an async job to create an Unpack for a conversation.
- Unpack sections (minimum):
  - summary
  - key points
  - triggers/escalations
  - “what I did that landed as harmful”
  - “don’t say/do” list

Acceptance criteria:
- User sees status: queued/running/complete/failed.
- On complete, Unpack renders with the required sections.

### F2) Tag suggestions
- AI suggests tags for:
  - conversation
  - unpack
- UI lets user accept/edit/remove.

Acceptance criteria:
- Suggested tags appear and can be edited; edits persist.

### F3) Regenerate without duplication
- Allow re-run of Unpack generation.

Acceptance criteria:
- Regenerate creates a new Unpack version or updates a selected Unpack (choose one approach) without duplicating messages/artifacts.

## Epic G — Reply drafting & edit coach
### G1) Generate reply variants
- From a conversation (and optionally a selected Unpack), generate:
  - short
  - medium
  - ultra-brief

Acceptance criteria:
- 2–3 variants appear within the reply editor and are saved.

### G2) Inline rewrite suggestions (tone)
- Provide “Rewrite in Kapil tone” action for a selected draft or selected text.

Acceptance criteria:
- Rewrites preserve meaning, stay concise, and avoid therapy-speak by default.

### G3) Risk highlights
- Detect and highlight risky patterns:
  - tone-policing
  - reassurance demands / binary questions
  - transactional/ledger framing

Acceptance criteria:
- Highlighted phrases show a short explanation and an alternative suggestion.

### G4) Mark as sent
- Manual “Mark as sent” toggle.

Acceptance criteria:
- Draft status persists and is visible in conversation history.

## Epic H — Playbook
### H1) CRUD playbook entries
- Create/list/edit/delete playbook entries.

Acceptance criteria:
- Entries persist and are searchable.

### H2) Insert playbook snippet into reply
- In reply editor, user can insert a playbook entry snippet.

Acceptance criteria:
- Inserted snippet is added to draft text and saved.

## Epic I — Search & retrieval
### I1) Conversation search
- Search by:
  - title
  - tag
  - keyword across messages/unpacks (choose v1 scope)

Acceptance criteria:
- Searching finds relevant conversations quickly on mobile.

## Epic J — Export bundle
### J1) One-click export per conversation
- Generate an “all-in-one” Markdown file containing:
  - conversation log
  - artifacts (transcripts + links)
  - unpacks
  - final reply (and optionally all drafts)
  - tags/metadata

Acceptance criteria:
- User downloads a Markdown file that can be placed into Obsidian and reads cleanly.

### J2) Export bundle with uploaded media
- If there are uploaded files, export as `.zip`:
  - `conversation.md`
  - `/media/*` (uploaded files)
  - Markdown uses relative links to `/media/*`

Acceptance criteria:
- Zip downloads successfully; Markdown links resolve when unzipped locally.

## Epic K — Deletion
### K1) Delete conversation (hard delete)
- Delete conversation cascades:
  - messages
  - artifacts
  - unpacks
  - reply drafts
  - storage objects

Acceptance criteria:
- After deletion, conversation is not retrievable and Storage objects are removed.

## Epic L — Payments & Subscription (Revenue)
### L1) Stripe Integration
- Set up Stripe Customer Portal.
- Implement "Upgrade to Pro" flow.
- Gate features based on subscription status (Free vs Pro).

Acceptance criteria:
- User can subscribe via Stripe.
- Pro features (Unlimited Unpacks, History) are locked for Free users.
- Subscription status syncs to Firestore `users/{uid}`.

---

## Suggested sequencing (Revenue Focused)
1) Epics A + B + C
2) L (Payments - Build the register first)
3) D (paste ingest)
4) E (artifact transcript paste)
5) F (Unpack)
6) G (reply editor)
7) H (playbook)
8) J (export)
9) K (delete cascade)
10) I (search)
