# Architecture: Unauthenticated Onboarding & Data Migration (SPEC-004)
**Document ID:** ARCH-004
**Based on Spec:** SPEC-004-ux-redesign
**Date:** December 20, 2025

## 1. Executive Summary

This architecture implements a **"Local-First, Cloud-Sync"** model to lower the barrier to entry. Users can experience the core value ("Unpacking" a conflict) without creating an account. Data is stored locally on the device ("Guest State") and securely migrated to an encrypted Firestore store upon authentication.

## 2. Core Concepts

### 2.1 The "Guest" State
**Problem:** We need to store structured data (Person, Context, Conflict) before we have a User ID.
**Solution:** `GuestStore` (Zustand + `persist` middleware).
- **Storage:** `localStorage`.
- **Scope:** Transient. Cleared immediately after successful migration.
- **Data Model:** Mirror of the core `Person` and `Entry` schemas but without database IDs.

### 2.2 The "Returning User" State
**Problem:** A user who has used the app before should not see the "Start Unpacking" (Onboarding) flow again.
**Solution:** `ClientPreferences` Store.
- **Tracked Flag:** `hasAuthenticatedBefore`.
- **Behavior:** 
  - If `false` (New/Cleared): Show "Start Unpacking" -> Routes to `/onboarding`.
  - If `true` (Returning): Show "Sign In to Resume" -> Triggers Google Auth Popup.

### 2.3 End-to-End Encryption (E2EE)
**Problem:** User data is sensitive. We must ensure we (the platform) cannot read it.
**Solution:** Client-side encryption using Web Crypto API (`AES-GCM`).
- **Key Storage:** `IndexedDB` (non-exportable `CryptoKey` where possible, or raw key wrapper).
- **Flow:** Data is encrypted *on the client* before ever being sent to Firestore.
- **Recovery:** Keys are protected by a local passphrase (if user opts in) or stored raw on device (MVP).

---

## 3. Implementation Details

### 3.1 Data Flow: New User
```mermaid
graph TD
    A[Landing Page] -->|Start Unpacking| B[Onboarding Flow]
    B -->|Save Data| C[GuestStore (Local)]
    C -->|Sign In| D[AuthProvider]
    D -->|Detect Guest Data| E{Has Encryption Key?}
    E -->|No| F[Redirect to /setup]
    F -->|Generate Key| G[KeyStore (IndexedDB)]
    G --> H[Migrate Data]
    H -->|Encrypt| I[Firestore (Encrypted)]
    H -->|Clear| C
    E -->|Yes| H
```

### 3.2 Component Architecture

#### `GuestStore` (`src/lib/stores/guest-store.ts`)
Manages the temporary state.
- `guestPerson`: The person being unpacked.
- `guestContext`: Why they matter.
- `guestUnpack`: The actual conflict content.

#### `OnboardingGuard` (`src/components/auth/onboarding-guard.tsx`)
Protect routing integrity.
- Prevents infinite loops between `/onboarding` and `/people`.
- Logic:
  - If `onboardingCompleted` is `false` AND user is authenticated -> Redirect to `/onboarding` (unless on `/setup`).
  - If `onboardingCompleted` is `true` -> Allow access to protected routes (`/people`).

#### `AuthProvider` (`src/lib/auth-context.tsx`)
The brain of the operation.
- **On Login:** Checks `guestStore.hasGuestData()`.
- **Migration:** 
  1. Detects guest data.
  2. verifies encryption key existence (`active-key.ts`).
  3. If missing key -> Redirect via `window.location` to `/setup?migrate=true`.
  4. If key exists -> Calls `createPerson` (which handles encryption) -> Updates `onboardingCompleted: true` -> Clears `GuestStore`.

#### `ClientPreferences` (`src/lib/stores/client-preferences.ts`)
Simple persistent flag tracker.
- set `hasAuthenticatedBefore = true` inside `AuthProvider` when a user is detected.

### 3.3 Data Deletion & Recovery
**Challenge:** Deleting data when "Locked" (encryption key lost).
**Implementation:** `performClientSideDataReset` in `export-service.ts`.
- **Problem:** Cloud Functions cannot decrypt/validate owner easily if keys are mismatched, and Firestore Rules might block generalized delete.
- **Fix:** Client queries proper paths (`/people` where `uid == user.uid`), iterates through subcollections, and deletes them individually using the user's auth token, ensuring clean slate even if encryption is broken.

## 4. Security Considerations

1.  **Guest Data Validity:** Guest data is unencrypted in `localStorage`. This is acceptable as it is transient and on the user's personal device before account creation.
2.  **Migration Race Conditions:** We use `window.location` hard redirects for setup to ensure React state doesn't render protected pages before keys are generated.
3.  **Permissions:** `firestore.rules` updated to allow users to `delete` their own `people` and `entries` documents, enabling the client-side self-healing flow.

## 5. Future Improvements
- **Passphrase Sync:** Currently keys are device-local. Future: Sync encrypted key bundle to Firestore for cross-device access.
- **Partial Migration:** Allow merging guest data with existing account data (currently assumes linear flow).
