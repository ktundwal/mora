# Mora Development Workflow

**Last Updated:** January 2026

This document describes the day-to-day development workflow for Mora using `bd` (beads) issue tracking.

---

## Quick Reference

```bash
# Find work
bd ready                      # What can I work on right now?
bd list --status=open         # All open issues
bd show <id>                  # View issue details

# Start work
bd update <id> --status=in_progress

# Complete work
bd close <id>

# Check status
bd stats                      # Project overview
bd blocked                    # What's stuck?

# Visualize
bd graph <id>                 # Dependency tree
```

---

## Current Work (Phase 1: Foundation)

Run `bd ready` to see what's available:

### Ready Now
- **[mora-ddy]** Deploy MIRA-OSS service to Cloud Run (P0)
- **[mora-6hj]** Connect Stripe billing (P1)

### Blocked (Waiting on Dependencies)
- **[mora-3ke]** Implement MIRA user ID mapping (P0) → Needs mora-ddy
- **[mora-r5o]** Build Firebase-MIRA bridge (P0) → Needs mora-ddy
- **[mora-yk3]** Memory v0 UI (visible recall + correction) (P0) → Needs mora-r5o
- **[mora-17o]** Build journal entry UI (P1) → Needs mora-r5o
- **[mora-85j]** Create thread list views (P1) → Needs mora-17o

### Dependency Chain
```
mora-ddy (Deploy MIRA)
  ↓
mora-r5o (Bridge) + mora-3ke (User mapping)
  ↓
mora-yk3 (Memory v0 UI)
  ↓
mora-17o (Journal UI)
  ↓
mora-85j (Thread views)
```

---

## Typical Workflow

### 1. Start Your Day

```bash
# See what's ready
bd ready

# Check blocked work
bd blocked

# View project health
bd stats
```

### 2. Pick an Issue

```bash
# View details
bd show mora-ddy

# Claim it
bd update mora-ddy --status in_progress
```

### 3. Work on It

- Check `docs/implementation/` for technical guidance
- Example: `docs/implementation/01-foundation/01-mira-deployment.md`
- Issue-specific notes are in the bd issue description itself

### 4. Complete It

```bash
# Mark done
bd close mora-ddy

# See what's now unblocked
bd ready
# (mora-r5o and mora-3ke are now available!)
```

### 5. Sync & Commit

```bash
# Beads auto-syncs, but you can force:
bd sync

# Commit your code changes
git add .
git commit -m "feat: deploy MIRA-OSS to Cloud Run"
git push
```

---

## Issue Types & Priorities

### Types
- **task** — Implementation work (deploy, build, configure)
- **feature** — User-facing functionality (UI, workflow)
- **bug** — Something broken
- **epic** — Large multi-issue effort

### Priorities
- **P0 (critical)** — Blocking ship, must do now
- **P1 (high)** — Core functionality
- **P2 (medium)** — Nice-to-have
- **P3 (low)** — Future enhancement
- **P4 (backlog)** — Maybe someday

---

## Creating Issues

### Simple Issue
```bash
bd create "Add error handling to bridge function" --type task --priority 2
```

### With Details
```bash
bd create "Implement pattern dashboard" \
  --type feature \
  --priority 1 \
  --description "Show users their defensive patterns over time. See Phase 2 in VISION.md"
```

### With Dependencies
```bash
# Create issue
bd create "Write E2E tests for journal flow" --type task --priority 1

# Add dependency
bd dep add mora-<test-id> mora-17o  # Tests depend on journal UI
```

---

## Managing Dependencies

### Add Dependency
```bash
bd dep add <issue> <depends-on>
# Reads as: "issue depends on depends-on"
# Or: "depends-on blocks issue"
```

**Example:**
```bash
bd dep add mora-17o mora-r5o
# Journal UI depends on bridge function
# Bridge function blocks journal UI
```

### View Dependencies
```bash
bd show <id>                    # See what blocks/blocked by this issue
bd graph <id>                   # Visual dependency tree
bd dep tree <id>                # Text-based tree
```

### Remove Dependency
```bash
bd dep remove <issue> <depends-on>
```

---

## Updating Issues

### Change Status
```bash
bd update <id> --status open           # Reopen
bd update <id> --status in_progress    # Working on it
bd update <id> --status done           # Complete (prefer bd close)
```

### Change Priority
```bash
bd update <id> --priority 0   # Make critical
bd update <id> --priority 2   # Lower priority
```

### Assign
```bash
bd update <id> --assignee kapil
```

### Add Description
```bash
bd update <id> --description "See docs/implementation/01-foundation/01-mira-deployment.md for details"
```

---

## Closing Issues

### Simple Close
```bash
bd close <id>
```

### Close with Reason
```bash
bd close <id> --reason "Completed in PR #42"
```

### Close Multiple
```bash
bd close mora-ddy mora-3ke mora-r5o
```

---

## Searching & Filtering

### List by Status
```bash
bd list --status open
bd list --status in_progress
bd list --status closed
```

### List by Priority
```bash
bd list --priority 0     # Critical only
bd list --priority 1,2   # High and medium
```

### List by Type
```bash
bd list --type feature
bd list --type task,bug
```

### Search Text
```bash
bd search "MIRA"
bd search "journal UI"
```

---

## Common Scenarios

### Scenario 1: Starting Fresh Work

```bash
# What can I work on?
bd ready

# Pick one
bd show mora-ddy

# Claim it
bd update mora-ddy --status in_progress

# Work on it...
# (deploy MIRA)

# Complete
bd close mora-ddy

# Check what's unblocked
bd ready
```

### Scenario 2: Discovering New Work

While working, you realize you need another task:

```bash
# Create it
bd create "Add health check endpoint to MIRA" --type task --priority 1

# Make it depend on current work
bd dep add mora-<new-id> mora-ddy
```

### Scenario 3: Blocked by External Issue

```bash
# You're waiting on something outside your control
bd update mora-r5o --status blocked

# Add comment explaining why
bd comment mora-r5o "Waiting for MIRA deployment to finish testing"

# Work on something else
bd ready  # Find other work
```

### Scenario 4: Breaking Down Large Work

```bash
# Create epic
bd create "Build complete journal entry flow" --type epic --priority 1

# Create sub-issues
bd create "Journal entry form component" --type task --priority 1
bd create "Voice recorder component" --type task --priority 1
bd create "Analysis display component" --type task --priority 1

# Link to epic (if using epic feature)
bd epic add mora-<epic-id> mora-<sub1> mora-<sub2> mora-<sub3>
```

---

## Git Integration

### Auto-Sync (Default)

bd automatically syncs with git:
- **After CRUD operations** (5s debounce) → Exports to `.beads/issues.jsonl`
- **After git pull** → Imports from JSONL if newer than DB
- **No manual export/import needed**

### Manual Sync

```bash
bd sync              # Bidirectional sync
bd sync --status     # Check sync status
```

### Git Hooks (Already Installed)

bd hooks are active and will:
- **pre-commit**: Validate beads data
- **post-merge**: Import latest JSONL
- **pre-push**: Ensure beads synced

---

## Working with Claude Code

When I (Claude) work on issues, I'll:

1. **Check what's ready:** `bd ready`
2. **Pick highest priority:** `bd show <id>`
3. **Claim it:** `bd update <id> --status in_progress`
4. **Implement it:** Follow `docs/implementation/` guidance
5. **Close it:** `bd close <id>`
6. **Report:** Tell you what's now unblocked

You can:
- Ask: "What should we work on?" → I'll run `bd ready`
- Request: "Start working on mora-ddy" → I'll claim and implement
- Check: "Show me the dependency graph" → I'll run `bd graph`

---

## Troubleshooting

### Issue: Database not found
```bash
bd info  # Check database location
bd doctor  # Run health check
```

### Issue: Sync conflicts
```bash
bd doctor --fix  # Attempt auto-fix
git status  # Check for conflicts in .beads/issues.jsonl
```

### Issue: Circular dependencies
```bash
bd dep cycles  # Detect cycles
bd dep remove <a> <b>  # Break the cycle
```

### Issue: Too many blocked tasks
```bash
bd blocked  # See what's stuck
bd graph mora-ddy  # Visualize the blocker tree
# Work on the root blocker first
```

---

## Best Practices

### ✅ Do

- **Use `bd ready` often** — It's your "what's next?" command
- **Update status** — Keep `in_progress` accurate
- **Add dependencies** — Prevent duplicate work, show relationships
- **Close when done** — Don't leave stale open issues
- **Reference docs** — Link to `docs/implementation/` in descriptions

### ❌ Don't

- **Don't skip dependencies** — They prevent chaos
- **Don't leave issues in `in_progress`** — Close or unassign if paused
- **Don't create duplicates** — Search first: `bd search "keyword"`
- **Don't forget to sync** — Git hooks handle it, but force if needed

---

## Phase 1 Goal: Ship Beta

**Target:** 10 beta users saying "This saved a conversation"

**Checklist:**
- [ ] Deploy MIRA-OSS (mora-ddy)
- [ ] Build Firebase bridge (mora-r5o)
- [ ] Implement user mapping (mora-3ke)
- [ ] Create journal UI (mora-17o)
- [ ] Build thread views (mora-85j)
- [ ] Connect Stripe (mora-6hj)

**Check progress:**
```bash
bd list --status closed  # What's done?
bd blocked               # What's stuck?
bd ready                 # What's next?
```

---

## Additional Resources

- **bd Documentation:** Run `bd quickstart` or `bd help`
- **Project Vision:** [docs/design/VISION.md](design/VISION.md)
- **Architecture:** [docs/design/ARCHITECTURE.md](design/ARCHITECTURE.md)
- **Implementation Details:** [docs/implementation/](implementation/)
