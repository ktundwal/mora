# Specification: Mobile-First UX Redesign & Unauthenticated Onboarding
**Document ID:** SPEC-004
**Created:** December 20, 2025
**Status:** Active

---

## 1. Purpose & Scope

**Purpose:** 
Redesign the user experience to be mobile-first and allow users to experience the core value ("Unpack" / "Drop the Shield") *before* requiring authentication. The flow should center on "People who matter".

**Scope:**
- ✅ **Landing Page:** Clear value prop + "Get Started" (No Auth).
- ✅ **Onboarding Flow:** 
  1. Add Person ("Who matters?")
  2. Input Context ("Why they matter" + Chat/Journal)
  3. Value Delivery (Unpack Preview/Generation)
  4. Nudge to Save -> Auth.
- ✅ **Local-First Data:** Store "Guest" data in `localStorage`.
- ✅ **Auth Migration:** Sync Guest data to Firestore upon successful sign-in.

---

## 2. Requirements

### 2.1 Landing Page (Mobile First)
| ID | Requirement |
|----|-------------|
| **REQ-UX-001** | Landing page must clearly articulate value: "Move from fear of losing to fear of hurting." |
| **REQ-UX-002** | Primary CTA "Start" / "Unpack conflict" must lead to Onboarding Flow *without* auth. |
| **REQ-UX-003** | Remove/Hide "Sign In" as the primary barrier. |

### 2.2 Onboarding Flow steps
The flow replaces the current direct "New Conversation" or "Dashboard" entry.

**Step 1: Who Matters? (Person)**
| ID | Requirement |
|----|-------------|
| **REQ-ONB-001** | Prompt user to identify one person (Name + Relationship Type). |
| **REQ-ONB-002** | Store this `Person` in a local-only store (`GuestStore`). |

**Step 2: Why they matter (Context)**
| ID | Requirement |
|----|-------------|
| **REQ-ONB-003** | Prompt for a short "Why they matter" or "What's the struggle?" (Saved to `Person.importanceNote`). |

**Step 3: context (The Conflict)**
| ID | Requirement |
|----|-------------|
| **REQ-ONB-004** | Ask "What happened recently?" -> Options: "Paste Chat" or "Write Journal". |
| **REQ-ONB-005** | If "Paste Chat", reuse existing `PasteStep` from `NewConversationPage`. |
| **REQ-ONB-006** | If "Write Journal", simple textarea for "Brain Dump". |
| **REQ-ONB-007** | Generate a "Draft" Unpack or Analysis immediately (mock or real if API allows). *Decision: For V1, maybe just show "Analysis Ready" state?* |
| **REQ-ONB-008** | **Crucial:** Do not ask for auth yet. |

**Step 4: The Nudge (Save)**
| ID | Requirement |
|----|-------------|
| **REQ-ONB-009** | Show a preview of the analysis or a "Unlock full insight" card. |
| **REQ-ONB-010** | CTA: "Save this to your secure space" / "Create account to keep this". |
| **REQ-ONB-011** | Clicking "Save" triggers Google Auth. |

### 2.3 Data Strategy (Local-First)
| ID | Requirement |
|----|-------------|
| **REQ-DATA-001** | Create `GuestStore` (Zustand + persist) to hold: `guestPerson`, `guestConversation`, `guestUnpack`. |
| **REQ-DATA-002** | `GuestStore` must be separate from authenticated `UserStore` / `ConversationStore` initially to avoid complexity, OR update existing stores to handle `uid=null`. |
| **REQ-DATA-003** | **Migration:** Upon `AuthProvider` detecting a new `user`, check `GuestStore`. If data exists, push to Firestore (`createPerson`, `createConversation`) and clear `GuestStore`. |

### 2.4 Mobile UX
| ID | Requirement |
|----|-------------|
| **REQ-MOB-001** | Navigation bar hidden during Onboarding Flow (Focus Mode). |
| **REQ-MOB-002** | Large touch targets (48px+). |
| **REQ-MOB-003** | "Thumb zone" friendly CTAs (Bottom of screen). |

---

## 3. Technical Changes

### 3.1 Architecture
- **Modify Stores:** `PersonStore` and `ConversationStore` need to support *local-only* mode.
  - Option A: Add `isLocal` flag to entities.
  - Option B: `GuestStore` handles the temporary state, and we only touch real stores after auth. *Recommendation: Option B for cleaner separation.*
- **Auth Boundary:** Push `AuthGuard` deeper. Routes `/onboarding` and `/` are public. `/conversations` (list) remains protected.

### 3.2 Migration Logic (`AuthProvider`)
- In `auth-context.tsx`, inside `onAuthStateChanged`:
  ```typescript
  if (user && hasGuestData()) {
     await migrateGuestData(user.uid);
  }
  ```

---

## 4. Screens / Route Map

1. `/` (Public) -> Landing Page. CTA: "Start".
2. `/onboarding/person` (Public) -> "Who do you want to understand better?"
3. `/onboarding/context` (Public) -> "Why do they matter? / What happened?"
4. `/onboarding/input` (Public) -> Paste Chat or Journal.
5. `/onboarding/preview` (Public) -> "We found X insights... Save to unlock."
6. `/auth/login` (or Modal) -> Google Sign In.
7. `/conversations/[id]` (Protected) -> The saved result.

---

## 5. Security Considerations
- **Guest Data:** Stored in `localStorage`. Sensitive? Yes.
- **Mitigation:** Clear `localStorage` explicitly after migration. Add warning "Data stored on device until saved."

---

- **Q:** Can we run AI analysis for unauthenticated users?
  - **A:** Yes, but with safeguards.
  - **Decision:** Use a **Lite Analysis** for guests. Implement **Rate Limiting** via Firestore (track requests by IP hash or persistent text ID) in the cloud function. Limit: 3 guest analyses per day per IP.

## 7. V2 Refinements (Voice & Visuals)
### 7.1 Voice Input
| ID | Requirement |
|----|-------------|
| **REQ-ONB-012** | Implement **Web Speech API** for "Stream of Consciousness" input. |
| **REQ-ONB-013** | UI: Prominent "Mic" button. Real-time transcript preview. |
| **REQ-ONB-014** | Fallback: If Web Speech isn't supported/denied, show text input. |

### 7.2 Relationship Grid (3x2)
| ID | Requirement |
|----|-------------|
| **REQ-UX-004** | Replace long list with 6 cards: Partner, Work Peer, Manager, Direct Report, Family, Friend/Other. |
| **REQ-UX-005** | Icons + Label for each card. |

### 7.3 Instant Value Flow
1. **User Input** (Voice/Text) -> **Analyze Button**.
2. **Cloud Function** (`analyzeGuest`) -> Checks Rate Limit -> Returns Lite Analysis.
3. **UI** -> Shows Analysis.
4. **CTA** -> "Save to Unlock Deep Insights" (Triggers Auth).


## Implementation plan

Implementation Plan: Auth & Encryption Flow Refinement
Overview
Refine the onboarding and post-authentication experience to properly handle encryption setup and provide a seamless flow for both new and returning users.

User Review Required
IMPORTANT

Encryption Setup Timing - CONFIRMED

Per user feedback: Encryption is only required when data moves to Firestore (DB). Guest data in localStorage doesn't need encryption.

Flow:

Guest completes onboarding → data stored in localStorage (unencrypted)
User clicks "Save & Continue" → signs in
Before migrating data to Firestore → prompt for encryption setup
Encrypt data → save to Firestore
This minimizes friction while ensuring all persisted data is encrypted.

WARNING

Breaking Change: Onboarding State Tracking - APPROVED

Adding onboardingCompleted: boolean to 
UserProfile
 type to track:

New users who just signed up (need encryption setup + onboarding)
Returning users who completed onboarding (go straight to people page)
NOTE

Testing Strategy - CONFIRMED

Using Firebase Auth Emulator for E2E tests. No test Google account needed.

Proposed Changes
Core Logic
[NEW] 
onboarding-guard.tsx
Create a new guard component that handles the routing logic:

Check auth state
Check encryption status
Check onboarding completion
Redirect accordingly
Authentication Flow
[MODIFY] 
auth-context.tsx
Update onAuthStateChanged callback:

Check if user has guest data to migrate
If yes, check if encryption is set up (
hasActiveCryptoKey()
)
If no encryption:
Redirect to /setup with ?migrate=true flag
Setup page will handle encryption setup
After setup, trigger migration
If encryption exists:
Proceed with migration (encrypt data before saving)
Set onboardingCompleted: true after successful migration
[MODIFY] 
preview/page.tsx
Update "Save & Continue" button:

After successful sign-in, don't redirect immediately
Let auth-context handle the redirect based on encryption status
Remove the current router.push('/') logic
Encryption Setup
[MODIFY] 
(app)/setup/page.tsx
Update setup page to:

Show "Secure Your Data" flow for first-time users
Explain encryption and recovery phrase
After setup, mark onboardingCompleted: true
Redirect to /people
People Page
[MODIFY] 
(app)/people/page.tsx
Enhance people page:

Show list of saved people
"Add Entry" button for each person (creates conversation)
"Add Person" button (triggers onboarding flow for authenticated users)
[NEW] 
(app)/people/[id]/new-entry/page.tsx
Create new entry page:

Similar to onboarding input flow
Pre-filled with person context
Saves as conversation linked to person
Onboarding Flow (Authenticated)
[MODIFY] 
onboarding/*/page.tsx
Update all onboarding pages to:

Detect if user is authenticated
Skip "Save & Continue" step (save directly)
Redirect to /people after completion
Home Page
[MODIFY] 
page.tsx
Current redirect logic:

Unauthenticated → stay on home
Authenticated → redirect to /people
Update to:

Unauthenticated → stay on home
Authenticated + no encryption → redirect to /setup
Authenticated + encryption + no onboarding → redirect to /onboarding (shouldn't happen)
Authenticated + encryption + onboarding → redirect to /people
Verification Plan
Manual Testing
New User Flow:

Start onboarding (unauthenticated)
Complete all steps
Click "Save & Continue"
Sign in with Google
Verify redirect to /setup
Complete encryption setup
Verify redirect to /people
Verify person data is visible
Returning User Flow:

Sign in
Verify redirect to /unlock (if locked)
Unlock
Verify redirect to /people
Verify can add new entry
Verify can add new person
Authenticated Onboarding:

Sign in
Go to /people
Click "Add Person"
Complete onboarding flow
Verify person is saved directly (no auth prompt)
E2E Playwright Tests
[NEW] 
tests/e2e/onboarding-flow.spec.ts
Test suite covering:

Unauthenticated onboarding → auth → encryption setup → people page
Authenticated user adding new person via onboarding
Authenticated user adding new entry for existing person
Unlock flow for returning users
Test Configuration:

Use Firebase Auth Emulator (no real Google account needed)
Set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in test env
Use signInAnonymously() or create test users via emulator API
Key test scenarios:

test('unauthenticated user completes onboarding and sets up encryption', async ({ page }) => {
  // 1. Start onboarding (guest mode)
  await page.goto('/onboarding');
  
  // 2. Complete all steps (identity, person, context, input)
  await page.fill('[name="displayName"]', 'Test User');
  // ... complete flow
  
  // 3. Click "Save & Continue"
  await page.click('text=Save & Continue');
  
  // 4. Sign in (triggers Google popup in emulator)
  // For emulator: we can use signInAnonymously or test account
  
  // 5. Verify redirect to /setup?migrate=true
  await expect(page).toHaveURL(/\/setup\?migrate=true/);
  
  // 6. Complete encryption setup
  await page.fill('[name="passphrase"]', 'test-passphrase');
  await page.click('text=Secure My Data');
  
  // 7. Verify migration happens and redirect to /people
  await expect(page).toHaveURL('/people');
  
  // 8. Verify person data is visible
  await expect(page.locator('text=Test Person')).toBeVisible();
});
test('authenticated user adds new person', async ({ page }) => {
  // 1. Sign in with existing test account (via emulator)
  await signInTestUser(page);
  
  // 2. Navigate to /people
  await page.goto('/people');
  
  // 3. Click "Add Person"
  await page.click('text=Add Person');
  
  // 4. Complete onboarding flow (should skip auth)
  await page.fill('[name="displayName"]', 'New Person');
  // ... complete flow
  
  // 5. Verify person is saved directly
  await expect(page).toHaveURL('/people');
  
  // 6. Verify new person appears in list
  await expect(page.locator('text=New Person')).toBeVisible();
});
test('returning user unlocks and accesses data', async ({ page }) => {
  // 1. Sign in with existing account (has passphrase-protected key)
  await signInTestUser(page, { hasPassphrase: true });
  
  // 2. Verify redirect to /unlock
  await expect(page).toHaveURL('/unlock');
  
  // 3. Enter passphrase
  await page.fill('[name="passphrase"]', 'test-passphrase');
  await page.click('text=Unlock');
  
  // 4. Verify redirect to /people
  await expect(page).toHaveURL('/people');
  
  // 5. Verify data is decrypted and visible
  await expect(page.locator('text=Test Person')).toBeVisible();
});
[NEW] 
tests/helpers/firebase-emulator.ts
Helper functions for emulator-based testing:

export async function signInTestUser(page: Page, options?: { hasPassphrase?: boolean }) {
  // Use Firebase Auth Emulator to create and sign in test user
  // Set up encryption key if needed
}
export async function clearFirestoreData() {
  // Clear emulator data between tests
}
Implementation Order
Update 
UserProfile
 type to include onboardingCompleted flag
Create OnboardingGuard component
Update /setup page for first-time encryption setup
Update auth-context migration to set onboardingCompleted: false
Update home page redirect logic
Enhance /people page with "Add Person" and "Add Entry" buttons
Create /people/[id]/new-entry page
Update onboarding pages to detect auth state and save directly
Write E2E tests

---

## 8. Milestone Report (Dec 20, 2025)

**Status:** ✅ Completed / Verified

### 8.1 Delivered Features
1.  **Smart Landing Page:** 
    - Auto-detects returning authenticated users (`ClientPreferences`).
    - Dynamic CTA: "Start Unpacking" (Guest) vs "Sign In to Resume" (Returning).
    - Direct Google Sign-In button integration.

2.  **Robust Onboarding Flow:**
    - Seamlessly guides unauthenticated users from "Who matters?" to "Why?" to "Context".
    - Data preserved across local storage.
    - **Guard Rails:** `OnboardingGuard` ensures users complete the flow or are redirected appropriately.

3.  **Authentication & Data Migration:**
    - `AuthProvider` detects guest data on login.
    - auto-migrates guest data to encrypted Firestore storage.
    - Sets `onboardingCompleted` flag to prevent loops.

4.  **People & Entries Management:**
    - **Grid Layout:** 2x3 responsive grid for People and Entries.
    - **Add Entry:** New flow to add context updates for existing people.
    - **Encryption:** End-to-End encryption verified for all Person and Entry fields.

5.  **Settings & Data Controls:**
    - **Sign Out:** Clean session clearing.
    - **Delete My Data:** Implemented robust client-side deletion fallback (wipes Firestore subcollections + LocalDB keys) to resolve "Locked" data states and permission errors.

### 8.2 Resolved Issues
- **Redirect Loops:** Fixed cycle between `/onboarding` and `/people` by refining guard logic and removing unconditional page redirects.
- **"Locked" Data:** Fixed by implementing proper key management and data wiping strategies for dev environments.
- **Permission Errors:** Corrected Cloud Function fallbacks and Firestore paths for deletion.

---

## 9. Next Steps

### 9.1 Voice Input (Priority)
- Integrate Web Speech API for "Stream of Consciousness" input in Onboarding/New Entry.
- Add visual feedback for recording state.

### 9.2 AI Integration (Lite Analysis)
- Connect "Analyze" button to Cloud Function.
- Implement "Lite Analysis" for guests (rate-limited).
- Display insights on the Preview/Detail page.

### 9.3 Playbook Implementation
- Build the "Playbook" view to aggregate insights across people.
- Implement "Pattern Recognition" across entries.