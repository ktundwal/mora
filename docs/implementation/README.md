# Mora Implementation Notes

This directory contains technical implementation guides organized by phase. These complement the work items tracked in `bd` (beads) by providing HOW-TO guidance for implementing features.

## Structure

```
docs/implementation/
├── 01-foundation/          # Phase 1: Foundation (Months 1-3)
├── 02-memory-patterns/     # Phase 2: Memory & Patterns (Months 4-6)
├── 03-decision-support/    # Phase 3: Decision Support (Months 7-9)
├── 04-self-model/          # Phase 4: Self-Model & Domaindocs (Months 10-12)
├── 99-backlog/             # Future ideas, not yet prioritized
└── README.md               # This file
```

## Purpose

**`bd` tracks WHAT (issues, status, dependencies) → This directory explains HOW (implementation details, code examples, architecture notes)**

When you pick up a work item from `bd`, check here for:
- Technical decisions already made
- Code examples and patterns to follow
- Architecture guidance
- Integration patterns with MIRA-OSS
- Testing strategies

## When to Add Implementation Notes

**Add to this directory when:**
- Implementation guidance applies to multiple issues
- Technical decisions need documentation (e.g., "How we integrate with MIRA")
- Code examples would help future work
- Architecture patterns should be consistent across features

**Add to bd issue description when:**
- Implementation notes are specific to a single issue
- Quick context that doesn't need a separate file
- Links to relevant code or docs

## Example Workflow

```bash
# 1. Find available work
bd ready

# 2. Pick an issue
bd show mora-ddy

# 3. Check for implementation guidance
ls docs/implementation/01-foundation/
cat docs/implementation/01-foundation/01-mira-deployment.md

# 4. Claim the issue
bd update mora-ddy --status in_progress

# 5. Implement following the guidance
# ... code ...

# 6. Close when done
bd close mora-ddy
```

## Current Phase

**Phase 1: Foundation (Months 1-3)**
- Goal: Ship beta to 20 users
- Success: 10 users say "This saved a conversation"
- Key work: MIRA deployment, journal UI, thread views
