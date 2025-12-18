---
description: 'Start development environment with proper Node version'
---

# Start Development Environment

Start the Mora development server with proper Node version handling.

## Instructions

1. **Check Node version** - Verify we're using Node 18-22 (Volta should handle this automatically)
2. **Ensure dependencies are installed** - Run `npm install` if node_modules is missing
3. **Build core package** - Run `npm run build:core` to ensure shared types are compiled
4. **Start dev server** - Run `npm run dev` to start Next.js on http://localhost:3000
5. **Start Firebase emulators** (optional) - If testing auth/Firestore locally

## Commands

```bash
# Set Volta path (if not in shell profile)
export VOLTA_HOME="$HOME/.volta" && export PATH="$VOLTA_HOME/bin:$PATH"

# Verify Node version (should be 20.x)
node --version

# Install deps if needed
npm install

# Build shared types
npm run build:core

# Start dev server
npm run dev

# Optional: Start Firebase emulators in separate terminal
cd infra/firebase && firebase emulators:start
```

## Common Issues

### lightningcss native module error
If you see `Cannot find module '../lightningcss.darwin-arm64.node'`:

```bash
# Ensure correct Node version, then reinstall
rm -rf node_modules apps/web/node_modules apps/web/.next
npm install
```

### Port 3000 already in use
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

## What to Verify

After starting, check:
- [ ] http://localhost:3000 loads the home page
- [ ] No console errors in browser dev tools
- [ ] Terminal shows "Ready" message from Next.js
