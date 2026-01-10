# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Workflow: From Issue to Implementation

**Single Source of Truth:** `bd` tracks WHAT work needs to be done. After fetching a work item, consult `docs/implementation/` for HOW to implement it.

```bash
# 1. Find available work
bd ready

# 2. View issue details
bd show mora-ddy

# 3. Check for implementation guidance
cat docs/implementation/01-foundation/01-mira-deployment.md

# 4. Claim the issue
bd update mora-ddy --status in_progress

# 5. Implement + test
# ... code ...

# 6. Close when done
bd close mora-ddy
```

**Implementation Notes Organization:**
- **`docs/implementation/`** - Technical guidance that applies to multiple issues (architecture patterns, integration examples, technical decisions)
- **bd issue description** - Implementation notes specific to a single issue (use `bd update <id> --description "..."`)

**Rule of Thumb:** If future work will reference it, put it in `docs/implementation/`. If it's specific to one issue, put it in the bd issue itself.

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

