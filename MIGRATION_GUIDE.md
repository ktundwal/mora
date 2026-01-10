# Migration Guide: GitHub Copilot → Claude Code

This guide helps you transition the Mora project from GitHub Copilot to Claude Code development workflows.

## What Changed

### Before (GitHub Copilot)
- Vibe coding with inline suggestions
- Limited context awareness (current file + nearby files)
- Manual tool execution (bash, git, etc.)
- No built-in task planning or tracking
- Limited to code completion and chat

### After (Claude Code)
- Full project context awareness (reads entire codebase)
- Autonomous tool execution (file operations, testing, git)
- Built-in task planning and tracking (TodoWrite)
- Plan Mode for complex implementations (EnterPlanMode)
- Parallel tool execution for performance
- Structured workflows with hooks

## New Files Added

### `.clauderc`
Configuration file for Claude Code. Tells Claude:
- Working directory: `/Users/admin/github/mora`
- Custom instructions location: `CLAUDE.md`
- Tool timeouts and settings

**Location**: `/Users/admin/github/mora/.clauderc`

### `CLAUDE.md`
Comprehensive development guide for Claude Code. Contains:
- Critical principles (technical integrity, security, reliability)
- Architecture overview (onboarding flow, stores, guards)
- Performance rules (parallel execution, tool selection)
- Implementation guidelines
- Common anti-patterns to avoid
- Development workflow commands

**Location**: `/Users/admin/github/mora/CLAUDE.md`

### `.gitignore` Updates
Added entries for Claude Code artifacts:
- `.claude/` - Claude Code session data
- `.claude-cache/` - Cached tool outputs

## Key Workflow Changes

### 1. Task Planning (NEW)

**Before (Copilot)**:
```
You: "Add a logout button"
Copilot: [generates code immediately]
```

**After (Claude Code)**:
```
You: "Add a logout button"
Claude: [Uses TodoWrite to break down task]
  1. Find existing auth logic
  2. Create logout button component
  3. Wire up Firebase signOut
  4. Test logout flow
  5. Update tests
Claude: [Executes tasks one by one, marking in_progress → completed]
```

### 2. Multi-Step Implementation (NEW)

**Before (Copilot)**:
```
You: "Implement dark mode"
Copilot: [suggests code snippet]
You: [manually find all files to update]
```

**After (Claude Code)**:
```
You: "Implement dark mode"
Claude: [Uses EnterPlanMode]
  - Explores existing theme setup
  - Identifies all files to modify
  - Presents plan for approval
You: "Approved"
Claude: [Implements entire plan across multiple files]
```

### 3. Testing Integration (NEW)

**Before (Copilot)**:
```
You: [writes code]
You: [manually runs npm run test]
You: [manually fixes errors]
```

**After (Claude Code)**:
```
Claude: [writes code]
Claude: [automatically runs npm run verify]
Claude: [fixes any errors and re-runs tests]
Claude: [reports success with test results]
```

### 4. Parallel Operations (NEW)

**Before (Copilot)**:
- Sequential suggestions
- One file at a time

**After (Claude Code)**:
```
Claude: [In a single message]
  - Read 5 files in parallel
  - Search 3 patterns in parallel
  - Run multiple bash commands in parallel
[Results come back faster]
```

## Claude Code Best Practices

### When to Use Each Tool

| Task | Tool | Why |
|------|------|-----|
| Read a file | `Read` | Fast, built-in error handling |
| Edit a file | `Edit` | Precise string replacement |
| Create a file | `Write` | Type-safe creation |
| Find files | `Glob` | Pattern matching (NOT bash find) |
| Search content | `Grep` | Fast search (NOT bash grep) |
| Complex search | `Task` (Explore) | Multi-step searches |
| Run tests | `Bash` | Terminal operations |
| Git operations | `Bash` | Native git commands |

### Task Management with TodoWrite

Use TodoWrite for any task with 3+ steps:

```typescript
// Claude automatically creates todos like:
[
  { content: "Find auth components", status: "in_progress", activeForm: "Finding auth components" },
  { content: "Add logout button UI", status: "pending", activeForm: "Adding logout button UI" },
  { content: "Wire up signOut handler", status: "pending", activeForm: "Wiring up signOut handler" },
  { content: "Run tests and verify", status: "pending", activeForm: "Running tests and verifying" }
]
```

Rules:
- Mark `in_progress` BEFORE starting work
- Mark `completed` IMMEDIATELY after finishing
- Only ONE task should be `in_progress` at a time

### Plan Mode for Complex Features

Use `EnterPlanMode` for:
- New feature implementation
- Architectural changes
- Multi-file refactors
- Anything where multiple approaches exist

Claude will:
1. Explore the codebase thoroughly
2. Understand existing patterns
3. Design an implementation approach
4. Present plan for your approval
5. Implement after approval

### Parallel Execution for Performance

**Bad** (Sequential):
```
Claude: Let me read file A
[waits for result]
Claude: Let me read file B
[waits for result]
Claude: Let me read file C
```

**Good** (Parallel):
```
Claude: [Single message with 3 Read tool calls]
[All results come back at once]
```

This applies to:
- Multiple file reads
- Multiple searches
- Multiple bash commands (if independent)

## Common Scenarios

### Scenario 1: Adding a New Feature

**Copilot Workflow**:
1. You describe feature in chat
2. Copilot suggests code snippets
3. You manually copy/paste into files
4. You manually run tests
5. You manually fix errors
6. Repeat until working

**Claude Code Workflow**:
1. You: "Add user profile editing feature"
2. Claude: [Uses EnterPlanMode]
   - Explores existing profile components
   - Identifies auth requirements
   - Presents plan
3. You: "Approved"
4. Claude: [Uses TodoWrite to track progress]
   - Reads relevant files in parallel
   - Creates new components
   - Updates existing files
   - Runs tests automatically
   - Fixes any errors
   - Reports success

### Scenario 2: Debugging an Issue

**Copilot Workflow**:
1. You describe the bug
2. Copilot suggests possible fixes
3. You manually find the files
4. You manually test
5. Repeat

**Claude Code Workflow**:
1. You: "Users can't complete onboarding"
2. Claude: [Uses Task with Explore agent]
   - Searches all onboarding files
   - Reads relevant components
   - Identifies the issue
   - Proposes fix with root cause analysis
3. You: "Fix it"
4. Claude: [Implements fix, runs tests, verifies]

### Scenario 3: Refactoring Code

**Copilot Workflow**:
1. You describe refactor
2. Copilot suggests changes
3. You manually update files
4. You manually verify no breakage
5. Hope you didn't miss anything

**Claude Code Workflow**:
1. You: "Refactor auth logic to use a custom hook"
2. Claude: [Uses EnterPlanMode]
   - Finds all auth usage locations
   - Plans migration strategy
   - Presents plan
3. You: "Approved"
4. Claude: [Uses TodoWrite]
   - Creates new hook
   - Updates all consumers in parallel
   - Runs full test suite
   - Verifies no breakage
   - Reports success

## Tips for Working with Claude Code

### 1. Be Specific About Intent
Instead of: "Fix the auth"
Say: "Users are getting logged out unexpectedly. Find the cause and fix it."

### 2. Let Claude Plan Complex Tasks
Instead of: "Change X, Y, and Z files"
Say: "Add feature [description]" and let Claude use EnterPlanMode

### 3. Trust Autonomous Tool Execution
Claude will:
- Read files without asking
- Run tests automatically
- Fix errors and retry
- Track progress with todos

### 4. Review Plans Before Approval
When Claude enters Plan Mode:
- Review the proposed approach
- Ask questions if unclear
- Approve or request changes

### 5. Use Context Effectively
Claude has full project context:
- "Update the onboarding flow" (Claude knows where it is)
- "Fix the TypeScript errors in the auth code" (Claude will find them)
- "Add tests for the guest migration" (Claude knows the architecture)

## Migration Checklist

- [x] Add `.clauderc` to project root
- [x] Create `CLAUDE.md` with project guidelines
- [x] Update `.gitignore` with Claude Code artifacts
- [x] Review `CLAUDE.md` and customize for your team's needs
- [ ] Remove any Copilot-specific configurations (`.github/copilot/`, etc.)
- [ ] Share `CLAUDE.md` with team members
- [ ] Update team documentation with new workflows

## Additional Resources

- **Claude Code Documentation**: Use `/help` in Claude Code CLI
- **Project Structure**: See `CLAUDE.md` → Architecture & Design
- **Common Anti-Patterns**: See `CLAUDE.md` → Critical Anti-Patterns to Avoid
- **Development Commands**: See `CLAUDE.md` → Development Workflow

## Getting Help

If you encounter issues with Claude Code:
- Type `/help` in the CLI for built-in documentation
- Check the [Claude Code GitHub Issues](https://github.com/anthropics/claude-code/issues)
- Review `CLAUDE.md` for project-specific guidance

---

**Remember**: Claude Code is not just a code completion tool—it's an autonomous development partner that can:
- Read and understand your entire codebase
- Plan complex implementations
- Execute multi-step tasks
- Run tests and verify changes
- Fix errors automatically
- Track progress transparently

Let it do the heavy lifting while you focus on product decisions and architecture.
