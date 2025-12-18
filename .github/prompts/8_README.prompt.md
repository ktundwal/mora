---
description: 'Generate or update README.md based on current project state'
agent: 'agent'
tools: ['codebase', 'search', 'fetch']
---

# README Generator

**Role:** Technical Writer
**Goal:** Create a comprehensive README.md for Mora.

---

## Step 1: Build Context (REQUIRED)

Read these files to understand the project:

1. **`docs/WHAT_AND_WHY.md`** - Product vision
2. **`docs/STACK.md`** - Technology decisions
3. **`docs/SETUP.md`** - Development setup
4. **`package.json`** - Scripts and dependencies
5. **`llms.txt`** - Project summary

---

## Step 2: Analyze Current State

1. Check existing README.md (if any)
2. List all npm scripts available
3. Identify key features implemented
4. Note any setup prerequisites

---

## Step 3: Generate README

Follow this structure:

```markdown
# Mora

> AI-powered relationship conflict management for anxious partners.

## What is Mora?

[1-2 paragraph description of the product and its value]

## Features

- ✅ [Implemented feature]
- 🚧 [In progress feature]
- 📋 [Planned feature]

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind v4 |
| State | Zustand |
| Backend | Firebase (Auth, Firestore, Functions) |
| Testing | Vitest, Playwright |

## Getting Started

### Prerequisites

- Node.js 18-22 (Volta recommended)
- Firebase CLI
- npm 10+

### Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/[owner]/mora.git
cd mora

# Install dependencies
npm install

# Set up environment
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local with your Firebase config
\`\`\`

### Development

\`\`\`bash
# Start dev server
npm run dev

# Run all checks
npm run verify

# Run E2E tests
npm run test:e2e
\`\`\`

## Project Structure

\`\`\`
mora/
├── apps/
│   ├── web/          # Next.js frontend
│   └── functions/    # Firebase Cloud Functions
├── packages/
│   └── core/         # Shared types and utilities
├── infra/
│   └── firebase/     # Firestore rules, indexes
└── docs/             # Documentation
\`\`\`

## Documentation

- [Product Requirements](docs/WHAT_AND_WHY.md)
- [Technical Stack](docs/STACK.md)
- [Development Process](docs/PROCESS.md)
- [Setup Guide](docs/SETUP.md)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[License type]
```

---

## Step 4: Quality Checklist

Before finalizing:
- [ ] All code blocks have language specified
- [ ] Links are relative and valid
- [ ] No excessive emojis
- [ ] Concise and scannable
- [ ] Up to date with current implementation

---

## Output

Generate the complete README.md content.
