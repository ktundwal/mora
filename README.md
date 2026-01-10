# Mora

> **Your AI thought partner for high-stakes moments in work, relationships, and life.**

Mora helps you pause when triggered, see your blind spots, and respond from your best self—powered by persistent AI memory that learns YOUR patterns.

---

## Vision

**The Problem:**
High-stakes moments (tense conversation with manager, conflict with partner, big life decision) fail not because people don't care, but because they lack emotional vocabulary, pattern awareness, and better language in the moment.

**Our Solution:**
- **Real-time intervention:** Pause before reacting, see what's really being said
- **Pattern recognition:** AI learns YOUR defensive patterns over time
- **Decision support:** Navigate crossroads with memory of your past choices
- **Self-model building:** Collaborative playbooks that persist forever

**Powered by MIRA-OSS:** Activity-based memory decay, entity knowledge graphs, and self-evolving domaindocs ensure context never dies.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
mora/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── functions/           # Firebase Cloud Functions
├── packages/
│   └── core/                # Shared types & utilities
├── mira-OSS/                # Memory engine (external, do not modify)
├── docs/
│   ├── design/              # Core design docs (VISION, ARCHITECTURE)
│   ├── decisions/           # ADRs (Architecture Decision Records)
│   ├── implementation/      # Technical guides for implementing features
│   └── specs/               # Legacy specs (reference only)
└── .beads/                  # bd issue tracker database (git-synced)
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4 |
| **Backend** | Firebase Cloud Functions (Gen 2) |
| **Database** | Firestore (UI metadata), PostgreSQL (MIRA memory) |
| **Auth** | Firebase Auth (Google OAuth, email/password) |
| **Encryption** | Web Crypto API (client-side E2EE) |
| **AI** | Anthropic Claude Opus 4.5, Google Gemini 1.5 Flash |
| **Memory Engine** | MIRA-OSS (FastAPI, PostgreSQL, Valkey) |
| **Testing** | Vitest (unit), Playwright (E2E) |

---

## Key Documentation

### Design Docs
- [VISION.md](docs/design/VISION.md) — Product vision, strategy, go-to-market
- [ARCHITECTURE.md](docs/design/ARCHITECTURE.md) — Technical architecture, data flow

### Decisions (ADRs)
- [001: MIRA-OSS Integration](docs/decisions/001-mira-oss-integration.md)
- [002: Product Positioning](docs/decisions/002-product-positioning.md)
- [003: Data Storage Strategy](docs/decisions/003-data-storage-strategy.md)

### Implementation Guides
- [docs/implementation/](docs/implementation/) — Technical guides for implementing features, organized by phase

### Work Tracking
- Use `bd` CLI: `bd ready` to see available work
- Issues tracked in `.beads/issues.jsonl` (git-synced)

---

## Development Workflow

```bash
# Find work
bd ready                       # Show available work
bd show mora-ddy               # View issue details

# Testing
npm run test:unit              # Vitest unit tests
npm run test:e2e               # Playwright E2E tests
npm run verify                 # Lint + typecheck + build + test (pre-commit)

# Build
npm run build                  # Build all: core + web + functions
```

See [WORKFLOW.md](docs/WORKFLOW.md) for complete workflow guide.

---

## License

Proprietary. All rights reserved.
