---
status: draft
priority: high
owner: admin
---

# SPEC-005: Fit and Finish Improvements

## 1. Overview
This spec outlines a series of "fit and finish" improvements to the Mora web application. The goal is to simplify the user experience, improve branding consistency, and fix specific workflow annoyances. These changes align with the "Simpler v1" philosophy and focus on the core "People" centric model.

## 2. Requirements

### 2.1 Authentication & Security
-   **Replace Google Auth:** Replace the current "one-off" `signInWithPopup` mechanism with `firebaseui` for a more robust and standard authentication flow.
-   **Fix Passphrase Prompt:** Investigate and fix the issue where the user is asked for their passphrase immediately after saving (onboarding or adding people). The session key should persist correctly to avoid unnecessary interruptions.

### 2.2 Navigation & Layout
-   **Global Header:**
    -   Introduce a consistent global header in `apps/web/src/app/(app)/layout.tsx`.
    -   **Branding:** Show "Mora" text with a classy, calm icon (e.g., Lucide `Anchor` or `Sparkles`).
    -   **Home Link:** Clicking the brand/icon should navigate to the People grid (`/people`).
    -   **Sign Out:** Include a "Sign Out" button in the header (Web only).
-   **Simplified Footer:**
    -   Remove "Chats", "New", and "Playbook" from the bottom navigation.
    -   The app is now "People-centric", not "Chat-centric".

### 2.3 People View (`/people/[id]`)
-   **Remove Linked Chats:** Remove the "Linked chats" card from the person detail view. This information is secondary and clutters the primary view.

### 2.4 New Entry Flow (`/people/[id]/new-entry`)
-   **Button Text:** Rename the "Analyze and save" button to "Help me think through" (or similar softer language).
-   **Redirect:** After saving an entry, redirect the user back to the **Person Detail View** (`/people/[id]`), NOT the Chat View (`/conversations/[id]`).
    -   *Note:* Do not delete the chat view code, just change the redirect destination.

## 3. Implementation Plan

### 3.1 Dependencies
-   Install `firebaseui` package if not present.

### 3.2 Code Changes

#### `apps/web/src/lib/auth-context.tsx` & `apps/web/src/components/auth/`
-   Refactor `signInWithGoogle` to use `firebaseui`.
-   Ensure the UI fits the "calm" aesthetic.

#### `apps/web/src/lib/crypto/`
-   Audit `KeyContext` and `CryptoGuard`.
-   Ensure the encryption key is properly cached in memory/session during the user's active session so it survives route transitions (like "Save" -> "Redirect").

#### `apps/web/src/app/(app)/layout.tsx`
-   Add `<Header />` component.
-   Update `navItems` to only include relevant items (likely just "People" and "Settings" if others are removed, or maybe just remove the footer entirely if "People" is the home). *Correction based on request:* "footer shows 'chats', 'new', 'playbook'. we should remove it." -> Remove specific items, keep "People" and "Settings".

#### `apps/web/src/app/(app)/people/[id]/page.tsx`
-   Remove the `Card` containing "Linked chats".

#### `apps/web/src/app/(app)/people/[id]/new-entry/page.tsx`
-   Update button label.
-   Update `router.push` in `handleSave`.

## 4. Verification
-   **Auth:** User can sign in using the new UI.
-   **Passphrase:** User is NOT prompted for passphrase after adding a person or finishing onboarding.
-   **Nav:** Header shows Brand + Sign Out. Footer is simplified.
-   **Flow:** "New Entry" -> Save -> Redirects to Person Page.
