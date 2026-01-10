# Mora - Claude Code Development Guide

Mora is a Next.js monorepo application for managing personal relationships and conflicts through AI-powered insights. Built with TypeScript, React, Firebase, and end-to-end encryption.

## 🚨 Critical Principles (Non-Negotiable)

### Claude Code Best Practices

- **Parallel Tool Execution**: When making multiple independent tool calls (file reads, searches, bash commands), execute them in a SINGLE message with multiple tool use blocks. This dramatically improves performance.
- **Tool Selection Discipline**:
  - Use Read/Edit/Write for file operations, NEVER bash cat/sed/echo
  - Use Glob for file pattern matching, NOT bash find
  - Use Grep for content search, NOT bash grep/rg
  - Use Task tool with specialized agents for complex, multi-step operations
- **TodoWrite Usage**: Proactively use TodoWrite for any non-trivial task with 3+ steps. Mark tasks in_progress BEFORE starting work, complete IMMEDIATELY after finishing. Only ONE task should be in_progress at a time.
- **EnterPlanMode for Implementation**: Use EnterPlanMode for any new feature implementation, architectural changes, or multi-file refactors. Get user sign-off before writing code.

### Technical Integrity

- **Evidence-Based Position Integrity**: Form assessments based on available evidence and analysis, then maintain those positions consistently. Don't adjust conclusions to match what you think the user wants to hear.
- **Brutal Technical Honesty**: Immediately reject technically unsound ideas. Call out broken ideas directly as "bad," "harmful," or "stupid" when warranted. Software engineering requires honesty, not diplomacy.
- **Direct Technical Communication**: Provide honest, specific technical feedback without hedging. Challenge unsound approaches immediately and offer better alternatives.
- **Concrete Code Communication**: Use specific line numbers, exact method names, actual code snippets, and precise file locations. Reference exact current state and exact proposed changes.
- **Numeric Precision**: Never conjecture numbers without evidence. Use qualitative language unless numbers derive from actual measurements, documented benchmarks, or calculations.
- **Ambiguity Detection**: When evidence supports multiple valid approaches, stop and ask using AskUserQuestion rather than guess.
- **No Tech-Bro Evangelism**: Avoid hyperbolic framing. Don't use phrases like "revolutionary changes" for standard implementations. A feature is a feature, a refactor is a refactor.

### Security & Reliability

- **Credential Management**: All sensitive values (API keys, Firebase config) must be in environment variables or secure configuration. Never commit credentials.
- **Fail-Fast Infrastructure**: Required infrastructure failures MUST propagate immediately. Never catch exceptions and return None/[]/defaults - this masks outages as normal operation.
- **No Optional[X] Hedging**: When a function depends on required infrastructure, return the actual type or raise - never Optional[X] that enables None returns masking failures.
- **Encryption First**: User data must be encrypted client-side before sending to Firestore. Use Web Crypto API (AES-GCM). No server-side decryption capability.
- **Backwards Compatibility**: Don't deprecate; ablate. Breaking changes are preferred at this stage as long as you let the user know beforehand. Retaining backwards compatibility contributes to code bloat.

### Core Engineering Practices

- **Thoughtful Component Design**: Design components that reduce cognitive load and manual work. Handle complexity internally, expose simple APIs.
- **Integrate Rather Than Invent**: Prefer established patterns over custom solutions. Use framework built-ins (Next.js, React, Zustand, Firebase).
- **Root Cause Diagnosis**: Before making code changes, investigate root causes by examining related files and dependencies. Address problems at their source.
- **Simple Solutions First**: Consider simpler approaches before adding complexity. Implement exactly what is requested without adding defensive fallbacks unless specifically asked.
- **Challenge Incorrect Assumptions Immediately**: When the user makes incorrect assumptions, correct them immediately with direct language like "That's wrong" or "You assumed wrong."

### Design Discipline Principles

#### Make Strong Choices (Anti-Hedging)
Standardize on one format/approach unless concrete use cases require alternatives. Every "just in case" feature is technical debt. Pick one and enforce it with strong types.

#### Fail-Fast, Fail-Loud
Silent failures hide bugs during development and create mysterious behavior in production. Use `error` log levels for problems, not `debug`. Validate inputs at function entry.

#### Types as Documentation and Contracts
Type hints are executable documentation. Avoid `any` - it's rarely justified. Use proper TypeScript types for well-defined structures. Match reality with types.

#### Naming Discipline = Cognitive Load Reduction
Variable names should match class/concept names. Pick one term per concept. Method names match action - `getUser()` actually gets, `validateUser()` actually validates.

#### Forward-Looking Documentation
Documentation describes current reality, not history. Write what code does, not what it replaced. Historical context belongs in commit messages, not code comments.

#### Standardization Over Premature Flexibility
Every code path is a potential bug. Don't add flexibility until you have concrete use cases. Wait for the second use case before abstracting.

#### Method Granularity Test
If the docstring is longer than the code, consider inlining the method. Abstraction should hide complexity, not add layers.

#### Hardcode Known Constraints
Don't parameterize what won't vary. Use constants with comments explaining why.

## 🏗️ Architecture & Design

### Project Structure

```
mora/
├── apps/
│   └── web/                    # Next.js application
│       ├── src/
│       │   ├── app/           # Next.js app router pages
│       │   │   ├── (app)/     # Protected routes (requires auth + crypto + onboarding)
│       │   │   ├── onboarding/ # Onboarding flow (6 steps)
│       │   │   ├── setup/     # Encryption setup
│       │   │   ├── unlock/    # Device passphrase unlock
│       │   │   └── recover/   # Recovery phrase import
│       │   ├── components/    # React components
│       │   │   ├── auth/      # AuthGuard, CryptoGuard, OnboardingGuard
│       │   │   ├── ui/        # Reusable UI components
│       │   │   └── ...
│       │   └── lib/           # Core business logic
│       │       ├── auth-context.tsx        # Authentication + migration orchestration
│       │       ├── crypto/                 # Web Crypto API encryption
│       │       ├── db/                     # Firebase/Firestore client
│       │       ├── stores/                 # Zustand state management
│       │       │   ├── guest-store.ts      # Pre-auth user data (localStorage)
│       │       │   ├── client-preferences.ts # hasAuthenticatedBefore flag
│       │       │   └── user-store.ts       # Authenticated user profile
│       │       └── migrate-guest-data.ts   # Guest → encrypted Firestore migration
│       └── tests/
│           └── e2e/           # Playwright E2E tests
├── packages/
│   └── core/                  # Shared TypeScript types and utilities
│       └── src/
│           ├── relationship-groups.ts  # Relationship category definitions
│           └── ...
└── mira-OSS/                  # External Python project (DO NOT MODIFY - synced from another repo)
```

### Key Architecture Patterns

#### Local-First, Cloud-Sync Model
- Users experience core value without creating an account
- Data stored in `GuestStore` (localStorage) during onboarding
- Secure migration to encrypted Firestore upon authentication
- End-to-end encryption via Web Crypto API (AES-GCM)

#### Three Essential Stores
1. **GuestStore** ([guest-store.ts](apps/web/src/lib/stores/guest-store.ts))
   - Manages unauthenticated user data
   - Persisted to localStorage as `mora-guest-store`
   - Cleared immediately after migration
   - Contains: `userDisplayName`, `guestPerson`, `guestContext`

2. **ClientPreferences** ([client-preferences.ts](apps/web/src/lib/stores/client-preferences.ts))
   - Tracks `hasAuthenticatedBefore` flag
   - Controls whether to show onboarding or sign-in prompt
   - Persisted to localStorage as `mora-client-prefs`

3. **UserStore** ([user-store.ts](apps/web/src/lib/stores/user-store.ts))
   - Manages authenticated user profile from Firestore
   - Tracks `onboardingCompleted` boolean
   - Subscription tier and usage tracking

#### Three-Layer Route Protection
All protected routes in `/(app)` are wrapped with guards in this order:
1. **AuthGuard** - Ensures user is authenticated (Firebase Auth)
2. **CryptoGuard** - Ensures encryption is initialized (IndexedDB key exists)
3. **OnboardingGuard** - Ensures onboarding is completed (prevents access to `/people` until done)

#### Onboarding Flow (6 Steps)
1. **Landing** - [onboarding/page.tsx](apps/web/src/app/onboarding/page.tsx)
2. **Identity** - [onboarding/identity/page.tsx](apps/web/src/app/onboarding/identity/page.tsx) - "What should we call you?"
3. **Person** - [onboarding/person/page.tsx](apps/web/src/app/onboarding/person/page.tsx) - Relationship type + name
4. **Context** - [onboarding/context/page.tsx](apps/web/src/app/onboarding/context/page.tsx) - "Why they matter?" (with voice recording)
5. **Input** - [onboarding/input/page.tsx](apps/web/src/app/onboarding/input/page.tsx) - Journal or paste chat
6. **Preview** - [onboarding/preview/page.tsx](apps/web/src/app/onboarding/preview/page.tsx) - AI analysis preview

After preview → Redirects to `/login` → Migration triggered in [auth-context.tsx](apps/web/src/lib/auth-context.tsx)

#### Data Migration Process
When user signs in with guest data:
1. [migrate-guest-data.ts](apps/web/src/lib/migrate-guest-data.ts) detects guest data in GuestStore
2. Verifies encryption key exists via `hasActiveCryptoKey()`
3. If no key: redirects to `/setup?migrate=true` to generate key + recovery phrase
4. Creates encrypted `Person` document with relationship info
5. Creates initial `Entry` document (type: 'interaction' or 'brain_dump')
6. Updates user profile: `onboardingCompleted: true`
7. Clears GuestStore from localStorage
8. Redirects to `/people`

### Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **UI**: React 19, Tailwind CSS 4, Radix UI
- **State Management**: Zustand 5
- **Authentication**: Firebase Auth
- **Database**: Firestore (with client-side encryption)
- **Encryption**: Web Crypto API (AES-GCM, non-exportable keys in IndexedDB)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Build Tool**: Next.js built-in (Turbopack in dev)

## ⚡ Performance & Tool Usage

### Critical Performance Rules

- **Parallel Tool Execution**: When making multiple independent tool calls, execute them in a SINGLE message with multiple tool use blocks. This dramatically improves performance and reduces context usage.
- **Multiple Edits**: When making multiple edits to the same file, make separate Edit calls in the same message for parallel execution.
- **File Operations**: Prefer Read/Edit/Write tools over Bash commands like 'cat'/'sed'/'echo' for file operations.
- **Synchronous Over Async**: Prefer synchronous unless genuine concurrency benefit exists. TypeScript/JavaScript should use async only for actual I/O operations (network, file I/O, external APIs).

### Tool Selection

- **Efficient Searching**: For complex searches across the codebase, use the Task tool with subagent_type=Explore for multi-step searches.
- **Task Management**: Use TodoWrite proactively for any non-trivial task with 3+ steps. Mark in_progress BEFORE starting, complete IMMEDIATELY after finishing.
- **Planning Mode**: Use EnterPlanMode for new features, architectural changes, or multi-file refactors. Get user approval before implementing.

## 📝 Implementation Guidelines

### Implementation Approach

- **Read Before Modify**: NEVER propose changes to code you haven't read. If a user asks about or wants you to modify a file, read it first.
- **Security Conscious**: Be careful not to introduce security vulnerabilities (XSS, command injection, auth bypass, etc.). If you notice insecure code, immediately fix it.
- **Avoid Over-Engineering**: Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused. Don't add features, refactoring, or "improvements" beyond what was asked.
- **No Backwards-Compatibility Hacks**: If something is unused, delete it completely. Don't rename to `_var`, add `// removed` comments, or re-export unused types.

### Implementation Strategy

- **Configuration-First Design**: Define configuration parameters before implementing functionality.
- **Iterative Refinement**: Start with a working implementation, then refine based on observations.
- **Root Cause Solution**: Every plan should trace solutions back to root causes, not symptoms. Use the "Why These Solutions Are Correct" analysis format when planning complex changes.

## 🔄 Development Workflow

### Commands

```bash
# Development
npm run dev                  # Start Next.js dev server (apps/web)

# Build
npm run build               # Build all: core package + web app
npm run build:core          # Build @mora/core package only
npm run build:functions     # Build Firebase functions

# Testing
npm run test:unit           # Run Vitest unit tests
npm run test:e2e            # Run Playwright E2E tests
npm run test                # Run all tests (unit + E2E)
npm run setup               # Install Playwright browsers

# Type Checking & Linting
npm run typecheck           # Type check all: core + web
npm run typecheck:core      # Type check @mora/core only
npm run lint                # ESLint

# Full Verification
npm run verify              # lint + typecheck + build + test (CI pipeline)

# Utilities
npm run clean               # Remove all node_modules
```

### Git Workflow

- **Before Committing**: Run `npm run verify` to ensure lint + typecheck + build + tests pass
- **Commit Messages**: Use conventional commits format:
  - `feat:` - New feature
  - `fix:` - Bug fix
  - `chore:` - Maintenance, deps updates, config changes
  - `docs:` - Documentation only
  - `refactor:` - Code restructuring without behavior change
  - `test:` - Adding or fixing tests
- **Never Commit**: Secrets, API keys, `.env` files, `node_modules`, build artifacts

### Testing Strategy

- **Unit Tests**: Use Vitest for isolated logic testing
  - Location: `apps/web/src/**/*.test.ts`
  - Run: `npm run test:unit`

- **E2E Tests**: Use Playwright for full user flow testing
  - Location: `apps/web/tests/e2e/`
  - Run: `npm run test:e2e`
  - UI Mode: `npm run test:e2e:ui`

- **Test Philosophy**:
  - Write tests for critical paths (auth, encryption, onboarding)
  - Don't test trivial getters/setters
  - Focus on user-facing behavior, not implementation details
  - E2E tests should mirror real user journeys

## 📚 Reference Material

### Key Files to Understand

**Authentication & Guards**
- [auth-context.tsx](apps/web/src/lib/auth-context.tsx) - Authentication + migration orchestration
- [onboarding-guard.tsx](apps/web/src/components/auth/onboarding-guard.tsx) - OnboardingGuard logic

**Onboarding Flow**
- [onboarding/page.tsx](apps/web/src/app/onboarding/page.tsx) - Landing
- [onboarding/identity/page.tsx](apps/web/src/app/onboarding/identity/page.tsx) - User name
- [onboarding/person/page.tsx](apps/web/src/app/onboarding/person/page.tsx) - Relationship selection
- [onboarding/context/page.tsx](apps/web/src/app/onboarding/context/page.tsx) - Importance note
- [onboarding/input/page.tsx](apps/web/src/app/onboarding/input/page.tsx) - Content input
- [onboarding/preview/page.tsx](apps/web/src/app/onboarding/preview/page.tsx) - AI preview

**Data Migration**
- [migrate-guest-data.ts](apps/web/src/lib/migrate-guest-data.ts) - Guest → encrypted Firestore

**State Management**
- [guest-store.ts](apps/web/src/lib/stores/guest-store.ts) - Pre-auth data
- [client-preferences.ts](apps/web/src/lib/stores/client-preferences.ts) - Returning user tracking
- [user-store.ts](apps/web/src/lib/stores/user-store.ts) - Authenticated profile

**Encryption**
- [apps/web/src/lib/crypto/](apps/web/src/lib/crypto/) - Web Crypto API wrappers

**Core Types**
- [packages/core/src/relationship-groups.ts](packages/core/src/relationship-groups.ts) - Relationship categories

### Documentation References

- **Architecture**: See commit `c821562` - "docs: add architecture document for onboarding implementation"
- **Recent Changes**: Check git log for recent onboarding, security, and E2E test updates
- **TypeScript**: Strict mode enabled, full type coverage expected

### Code Style

- **TypeScript**: Use explicit types, avoid `any`, prefer interfaces over types for objects
- **React**: Use function components with hooks, avoid class components
- **Imports**: Use absolute imports with `@/` prefix for app code, `@mora/core` for shared types
- **Naming**:
  - Components: PascalCase
  - Functions: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case.tsx/ts
- **Error Handling**: Throw errors with descriptive messages, don't silently catch and ignore
- **Async/Await**: Use async/await for promises, avoid .then() chains

---

# Critical Anti-Patterns to Avoid

This section documents recurring mistakes specific to Mora development.

## ❌ Over-Engineering Without Need
**Example**: Adding severity levels to errors when binary worked/failed suffices
**Lesson**: Push back on complexity. If you can't explain why it's needed, it probably isn't.

## ❌ Modifying Synced External Projects
**Example**: Editing files in `mira-OSS/` directory
**Lesson**: The `mira-OSS` directory is synced from an external repository. Never modify it. Focus on the Mora parent project only.

## ❌ Premature Abstraction
**Example**: Creating wrapper classes for utilities used in one place, configuration objects for scenarios that don't exist
**Lesson**: Start with the straightforward solution. Abstractions should emerge from repeated patterns in actual code, not from anticipated future needs.

## ❌ Silent Failures in Critical Paths
**Example**: `try { await encryptData() } catch { return null }` making encryption failures look like empty data
**Lesson**: Encryption, authentication, and database operations must fail loudly. Never catch and return null/[]/defaults.

## ❌ Type System Bypass
**Example**: Using `any` or `as any` to bypass TypeScript errors
**Lesson**: Fix the root type issue. If types don't match, investigate why. Using `any` masks design problems.

## ❌ Skipping Tests for "Simple" Changes
**Example**: "This is just a small refactor, no need to run tests"
**Lesson**: Always run `npm run verify` before committing. "Simple" changes often have unexpected side effects.

## ❌ Committing Sensitive Data
**Example**: Accidentally committing `.env.local` with Firebase credentials
**Lesson**: Never commit secrets. Use `.gitignore`. If you accidentally commit secrets, revoke them immediately and rotate.

## ❌ Breaking Onboarding Flow
**Example**: Adding required fields to GuestStore without updating all 6 onboarding pages
**Lesson**: The onboarding flow is fragile. When modifying GuestStore schema, check all pages: identity → person → context → input → preview → migration.

## ❌ Bypassing Route Guards
**Example**: Directly accessing Firestore in a component without going through guards
**Lesson**: All protected routes must go through AuthGuard → CryptoGuard → OnboardingGuard. Never bypass this chain.

## ❌ Forgetting IndexedDB Key Availability
**Example**: Calling encryption functions without checking `hasActiveCryptoKey()` first
**Lesson**: Always verify encryption key availability before attempting encryption operations. If key is missing, redirect to `/setup`.
