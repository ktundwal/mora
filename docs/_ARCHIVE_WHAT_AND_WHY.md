# Mora Product Requirements (PRD)

Date: Dec 18, 2025
Owner: Kapil

## 1) Product Vision & Value Proposition
Canonical narrative positioning (vision, framing, and “why now”) lives in [docs/BUSINESS.md](docs/BUSINESS.md) to avoid duplication.

## 2) Target user
Canonical target user definition lives in [docs/BUSINESS.md](docs/BUSINESS.md).

## 3) Key outcomes (success looks like)
Canonical success metrics live in [docs/BUSINESS.md](docs/BUSINESS.md).

## 3.5) Monetization (Business Model)
Canonical monetization model lives in [docs/BUSINESS.md](docs/BUSINESS.md).

## 4) Hard constraints
- Cloud web first, **mobile-friendly** (phone browser primary)
- **Authentication:** Google Auth (primary) + Email/Password (supported via FirebaseUI)
- Use **GCP/Firebase** (Auth, Firestore, Storage, Functions/Run)
- Code lives on GitHub with CI/CD deployment pipeline
- Environments: dev + prod Firebase projects; preview deploys should target dev/staging, prod only from `main`.

## 5) Guardrails (non-negotiable requirements)
### 5.1 Permission & privacy
- Import/upload requires a user confirmation checkbox: “I have the right/permission to upload and process this content.”
- Default privacy: private to the authenticated user only.
- Deletion: user can hard-delete a conversation and all derived data/artifacts.

### 5.2 Data minimization
- Logging must not include raw message content by default.
- Provide a “redaction mode” (v1.1 if not v1): remove phone numbers/emails/addresses before analysis/export.

### 5.3 Platform constraints (avoid fragile automation)
- No direct WhatsApp integration required in v1 (paste/export upload only).
- No Instagram scraping requirement in v1; support user-provided upload or user-pasted transcript.

### 5.4 "No-Shield" Rule (Psychological Guardrail)
- The app must not encourage "winning" or "defending."
- If draft sentiment is highly defensive (explaining logic, defending intentions), prompt: "Drop the Shield. You are explaining logic. She needs to feel heard."

## 6) Jobs to be done (JTBD)
1) **Capture**: “Get raw WhatsApp conversation into the system fast.”
2) **Normalize**: “Parse speakers/timestamps and keep the thread readable.”
3) **Understand**: “Generate Unpack (what she’s saying, what I did, what to avoid).”
4) **Act**: “Draft and edit replies in my tone, with risk flags.”
5) **Archive**: “Store + search history; export to Markdown (Obsidian-compatible).”

## 7) MVP scope (v1)
### 7.1 Conversation capture
- Create conversation from:
  - Paste chat text (required)
  - Upload WhatsApp export `.txt` (nice-to-have in v1; required by v1.1)
- Parse into message list:
  - speaker (User/Partner/Unknown), timestamp (nullable), message text, order
- Quick UI to correct speaker labels + fix ordering

### 7.2 Artifact capture (reels)
- Attach to a conversation:
  - Paste transcript text (required)
  - Upload video file (nice-to-have in v1; required by v1.1)
  - Optional: store reel URL as reference

### 7.3 Unpack generation
- One click: generate an Unpack for a conversation.
- Output fields (minimum):
  - Short summary (1–2 paragraphs)
  - Key points she’s communicating (bullets)
  - Triggers / escalation moments (bullets)
  - “What I did that likely landed as harmful” (bullets)
  - **Agency Check**: Did I offer a choice or decide unilaterally? Did I move too fast?
  - “Don’t say/do” list (anti-therapy-speak / anti-tone-policing)

### 7.4 Reply drafting + edit coach
- Generate 2–3 reply variants: Short / Medium / Ultra-brief.
- Reply editor supports:
  - Inline rewrite suggestions in user’s texting tone
  - **Therapy Speak Detector**: Flag "I hear you saying," "holding space," "my core values." Suggest human alternatives ("I get it," "That hurts").
  - Risk highlights (e.g., tone-policing, reassurance demands, ledger/transaction language)
  - “Mark as sent” (manual toggle)
- Store: all drafts + edit history

### 7.5 Playbook
- CRUD playbook entries:
  - “In the moment card” scripts
  - Do/Don’t lists
  - Repeatable response templates
- Ability to insert a playbook snippet into the reply editor

### 7.6 Export
- One-click export per conversation.
- Export includes: conversation + artifacts (at least transcript text + URLs) + unpack(s) + final reply (and optionally all drafts) + relevant playbook snippets referenced.
- Export output format:
  - A single, Obsidian-compatible Markdown file that contains all related content in one place.
  - If the conversation includes uploaded files (e.g., reel video), export is delivered as an “export bundle” (e.g., a `.zip`) that contains the Markdown plus the media files, with relative links from the Markdown.
- Export verification: headings preserved, timestamps normalized to local time, playbook snippets included; for zip exports, media links resolve when unzipped locally.

## 8) V1.1 / V2 scope (explicitly not required for v1)
- Video transcription pipeline (upload video → transcript)
- OCR of on-screen text from reels
- Multi-user shared workspace
- Direct WhatsApp integration
- Reel download/scrape automation
- “Auto-send to WhatsApp”

## 9) UX requirements (mobile-first)
### 9.1 Navigation
- Bottom nav (or equivalent): Conversations / New / Playbook / Settings

### 9.2 Screens
1) **Conversations list**
   - search, sort by recent
2) **Conversation detail**
   - messages (read-only), artifacts, generated unpacks, drafts
3) **New conversation**
   - paste/upload, parse preview, speaker mapping
4) **Unpack view**
   - structured sections + regenerate button
   - **Witness Pause**: "Draft Reply" button disabled initially. User must acknowledge "Her Pain" section first. Micro-copy: "Don't fix it yet. Sit with it."
5) **Reply editor**
   - variants + inline edits + risk flags
6) **Playbook**
   - entries list + editor
7) **Settings**
   - data export, delete account, retention controls (if supported)

### 9.3 Tone constraints
- Output should avoid therapy-speak by default (configurable).
- Reply drafts should match user style: concise, direct, “phone-text” feel.
- Autosave/offline safety: in-progress imports and reply drafts autosave locally so a mobile connection drop doesn’t lose work (lightweight offline tolerance).
- Accessibility/performance: mobile-first perf target (e.g., Lighthouse > 80) and basic a11y (text scaling, contrast, focus states).

## 10) Data model (Firestore-level requirements)
Minimal collections (names flexible):
- `users`
- `conversations`
- `messages`
- `artifacts`
- `unpacks`
- `replyDrafts`
- `playbookEntries`

Key relationships:
- Conversation has many Messages, Artifacts, Unpacks, ReplyDrafts
- Unpack can reference specific message ranges and artifacts

Fields (minimum):
- Conversation: title, participants, createdAt, updatedAt, sourceType
- Message: conversationId, orderIndex, speaker, timestamp?, text, rawText?
- Artifact: conversationId, type, url?, storagePath?, transcriptText, ocrText?
- Unpack: conversationId, createdAt, sections JSON
- ReplyDraft: conversationId, unpackId?, createdAt, variantType, text, status, editHistory
- PlaybookEntry: title, body, tags, lastUsedAt

## 11) AI requirements
### 11.1 Capabilities
- Summarization + extraction + suggestion
- Rewrite in “user phone-text tone”
- Highlight risky phrases and suggest safer alternatives
- **Fear Classifier**: Detect "Fear of Losing" (reassurance seeking) vs "Fear of Hurting" (care). Flag reassurance seeking as "Transaction/Reassurance Spiral."

### 11.2 Prompting principles
- Ground Unpack in provided text only (no invented facts).
- Identify assumptions explicitly.
- Keep drafts short and non-robotic.
- **Toxic List Constraint**: Explicitly forbid "Tone Policing," "Safety/Victimhood" claims, and clinical labels (Narcissist, etc.).

### 11.3 Async execution
- Unpack and transcription jobs must run async with UI statuses:
  - queued → running → complete → failed
- Retry allowed without duplicating artifacts/messages

### 11.4 Tag suggestions (AI-assisted)
- System suggests tags for:
  - Conversations (overall)
  - Unpacks (per generated analysis)
  - Reply drafts (optional)
- Tags are suggestions only; user can accept/edit/remove.
- Over time, the system should learn from accepted tags for better suggestions (no requirement for automated classification in v1).

### 11.5 AI cost controls
- Track per-user usage (generations, tokens/minutes, storage); warn at thresholds; allow hard caps.
- Provide a “safe mode” toggle to disable costly features temporarily.

## 12) Security, compliance, reliability
- Auth: Google sign-in (Firebase Auth)
- Authorization: per-user security rules; no cross-user reads
- Encryption: in transit + at rest via platform
- Storage: videos/artifacts stored in Firebase Storage with strict rules
- Deletion:
  - delete conversation cascades to messages/unpacks/drafts/artifacts + storage objects
  - delete account removes all user data
- Observability:
  - error logs redacted; include request IDs, not content
  - structured logs/metrics for failed jobs; alert on repeated failures
  - keep raw content out of logs; use IDs for correlation

- Redaction mode specifics (v1.1 if not v1): strip phone numbers, emails, @handles, URLs, and obvious addresses on import or export (user-selectable).

- Schema versioning/migrations: include `schemaVersion` on documents and a plan to migrate forward (script/Function); CI should validate expected shapes.

## 13) CI/CD requirements (GitHub → Firebase)
- GitHub repo with:
  - PR checks: lint + typecheck + unit tests (as applicable)
  - build verification
- Deployment:
  - merge to `main` auto-deploys to production
  - (optional) PR preview deploy
- Secrets:
  - stored in GitHub Actions secrets
  - no secrets committed to repo

## 14) MVP acceptance criteria
- On a phone, user can:
  - sign in with Google
  - create a conversation from pasted WhatsApp text
  - correct speaker mapping
  - add a reel transcript
  - generate Unpack
  - generate reply variants, edit, and mark one as “sent”
  - search and retrieve the conversation later
  - export to Markdown
  - delete the conversation and confirm it is gone

## 15) Risks / decisions
- Cost: AI usage and video transcription can get expensive quickly.
- Data sensitivity: trust and legal risk if users upload content they shouldn’t.
- Parsing variability: WhatsApp export formats differ by locale/device.
- Tone accuracy: needs a “tone calibration” mechanism (few-shot examples) without overfitting.

Decisions:
1) Timestamps: normalize and display in the user’s local time zone.
2) Tagging: AI suggests tags; user curates them over time.
3) Export: one-click export that outputs an “all-in-one” Markdown file per conversation (plus a bundle containing any uploaded media, if present).
