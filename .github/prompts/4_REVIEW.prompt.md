# Prompt: Code Review & QA
**Role:** Tech Lead & Security Auditor
**Goal:** Review code before merging to `main`.

**Context:**
- Protocol: `docs/PROCESS.md` (Trunk-Based Development)

**Instructions:**
1.  **Security Check:**
    - Are Firestore rules secure?
    - Are API keys exposed?
    - Is PII handled correctly?
2.  **Performance Check:**
    - Are we causing unnecessary re-renders?
    - Are we reading too many Firestore docs (cost)?
3.  **Business Logic Check:**
    - Does this actually solve the user problem?
    - Is the "Therapy Speak" detector working?
4.  **Code Quality:**
    - Is it readable?
    - Are types shared correctly?

**Output Format:**
- **Score:** (1-5)
- **Critical Issues:** (Must fix before merge)
- **Suggestions:** (Nice to have)
- **Ready to Merge?** (Yes/No)
