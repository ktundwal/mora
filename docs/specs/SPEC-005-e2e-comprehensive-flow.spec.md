# Specification: Comprehensive E2E UX Test Flow

**Document ID:** SPEC-005  
**Created:** December 21, 2025  
**Status:** Draft  

---

## 1. Purpose & Scope

**Purpose:**  
To define a rigorous End-to-End (E2E) test specification that validates the entire user lifecycle, including account creation, encryption setup, cross-device synchronization, and local security management. This spec serves as the blueprint for the Playwright test suite implementation.

**Scope:**
- **Authentication:** Email/Password flow (FirebaseUI).
- **Onboarding:** Initial profile and encryption setup.
- **Encryption:** Recovery phrase generation and restoration.
- **Device Security:** Local passphrase (Unlock Phrase) management (Set, Unlock, Remove).
- **Core Features:** People management, Journal entries.
- **Session Management:** Login, Logout, Cross-browser simulation.

**Target Environment:**  
- Playwright E2E tests running against local dev server.
- Chromium browser (primary), with multi-context support to simulate different devices.

---

## 2. Test Actors & Data

| Actor | Description |
|-------|-------------|
| **User A** | A new user creating an account for the first time. |
| **Device A** | The primary browser context (e.g., Laptop). |
| **Device B** | A secondary browser context (e.g., Phone or Public Computer) used to verify sync and recovery. |

**Test Data:**
- **Email:** `e2e-test-[timestamp]@example.com`
- **Password:** `TestPass123!`
- **Partner Name:** "Alex"
- **Entry 1:** "First entry from Device A"
- **Entry 2:** "Second entry from Device B"
- **Device A Passphrase:** `device-a-secret`
- **Device B Passphrase:** `device-b-secret`

---

## 3. Detailed Test Flow

### Phase 1: New User & Device A Setup
**Context:** Browser Context A (Clean State)

1.  **Sign Up**
    - Navigate to `/`.
    - Click "Get Started".
    - Select "Sign in with Email".
    - Create account with **Test Email** and **Password**.
    - *Verify:* Redirected to Onboarding.

2.  **Onboarding & Encryption**
    - Complete Profile Step (Name: "Test User").
    - **Encryption Setup:**
        - Click "Generate Key".
        - **Capture:** Save the 24-word Recovery Phrase.
        - Confirm the 3 random words.
    - *Verify:* Redirected to Dashboard (`/`).

3.  **Device Security (Device A)**
    - Navigate to `/settings`.
    - Locate "Device Security" card.
    - Click "Enable".
    - Enter **Device A Passphrase**.
    - Click "Set Phrase".
    - *Verify:* Button changes to "Disable". Toast confirms "Device lock enabled".

4.  **Core Actions (Device A)**
    - **Add Person:**
        - Go to `/people`.
        - Click "Add Person".
        - Name: "Alex", Relationship: "Partner".
        - Save.
        - *Verify:* "Alex" appears in list.
    - **Add Entry:**
        - Go to `/journal` (or Home).
        - Create new entry for "Alex".
        - Content: **Entry 1**.
        - Save.
        - *Verify:* Entry appears in timeline.

5.  **Session End**
    - Click "Sign Out" in Settings.
    - *Verify:* Redirected to Landing Page.

---

### Phase 2: Returning User on New Device (Device B)
**Context:** Browser Context B (Clean State - Simulates different machine)

1.  **Sign In**
    - Navigate to `/`.
    - Click "Sign In".
    - Enter **Test Email** and **Password**.
    - *Verify:* Redirected to Dashboard.

2.  **Encryption Recovery**
    - *Observation:* Dashboard shows "Encryption Locked" or prompts for key.
    - Click "Enter Recovery Phrase".
    - Input the **24-word Recovery Phrase** captured in Phase 1.
    - Submit.
    - *Verify:* Data is decrypted. "Alex" and **Entry 1** are visible.

3.  **Device Security (Device B)**
    - Navigate to `/settings`.
    - Click "Enable" on Device Security.
    - Enter **Device B Passphrase** (Different from Device A).
    - Save.
    - *Verify:* Device B is now locked with its own passphrase.

4.  **Core Actions (Device B)**
    - **Add Entry:**
        - Create new entry for "Alex".
        - Content: **Entry 2**.
        - Save.
        - *Verify:* Both **Entry 1** and **Entry 2** are visible.

5.  **Session End**
    - Click "Sign Out".

---

### Phase 3: Returning to Device A (Locked)
**Context:** Browser Context A (Persisted State)

1.  **Return & Unlock**
    - Navigate to `/`.
    - *Verify:* App prompts for **Unlock Phrase** (Local Key is present but encrypted).
    - **Negative Test:** Enter wrong passphrase. *Verify:* Error message.
    - **Positive Test:** Enter **Device A Passphrase**.
    - *Verify:* Dashboard loads.

2.  **Data Sync Verification**
    - Check Timeline.
    - *Verify:* **Entry 2** (created on Device B) is visible.

3.  **Remove Device Security**
    - Navigate to `/settings`.
    - Click "Disable" on Device Security.
    - Confirm removal.
    - *Verify:* Button changes to "Enable".

4.  **Session End**
    - Click "Sign Out".

---

### Phase 4: Returning to Device A (Unlocked)
**Context:** Browser Context A (Persisted State)

1.  **Return & Auto-Access**
    - Navigate to `/`.
    - Sign In (if session expired) or Auto-login.
    - *Verify:* **NO** Unlock Phrase prompt is shown.
    - *Verify:* Dashboard loads immediately with data visible.

---

## 4. Implementation Notes

- **Playwright Fixtures:** Use `test.step` to clearly demarcate phases.
- **Context Isolation:** Use `browser.newContext()` to create Device A and Device B.
- **Clipboard Handling:** The Recovery Phrase copy step needs to be handled by reading the UI elements, as clipboard access in headless mode can be flaky.
- **Selectors:** Ensure stable data-testid attributes are used where possible, or robust text selectors.
