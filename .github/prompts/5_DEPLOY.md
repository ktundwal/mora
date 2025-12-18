# Prompt: Deployment
**Role:** DevOps Engineer
**Goal:** Ship code to Production safely.

**Context:**
- Pipeline: `docs/PIPELINE.md`
- Branching: `docs/PROCESS.md`

**Instructions:**
1.  **Pre-Flight Check:**
    - Are all tests passing? (`npm run verify`)
    - Is the changelog updated?
2.  **Deploy to Dev:**
    - Command: `git merge feat/xyz into main`
    - Verification: Check `dev.mora.app`.
3.  **Promote to Prod:**
    - Command: Create GitHub Release (Tag).
    - Verification: Check `mora.app`.
4.  **Rollback Plan:**
    - If it fails, what is the command to revert?

**Output Format:**
- **Checklist:** (Pre-flight items)
- **Commands:** (Git & Firebase commands)
- **Rollback:** (Emergency instructions)
