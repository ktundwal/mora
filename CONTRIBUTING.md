# Contributing

## Workflow
1) Create a branch
2) Write intent + plan (see `docs/VIBE_PROTOCOL.md`)
3) Write tests first (unit/e2e)
4) Implement minimal code to pass
5) Run `npm run verify`
6) Open PR (use the template)
7) Merge only when CI is green

## Local verification
- One-time setup: `npm run setup` (installs Playwright browsers)
- `npm run verify` (lint + typecheck + build + tests)

## Commits
- Keep commits small and descriptive.
- Prefer PRs over direct pushes to `main`.
