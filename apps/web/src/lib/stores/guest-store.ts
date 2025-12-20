/**
 * Guest Store
 *
 * Zustand store for managing unauthenticated user data during the onboarding flow.
 * Data is persisted to localStorage so users don't lose progress if they refresh.
 * This data is migrated to Firestore once the user authenticates.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
// import type { Speaker } from '@mora/core';

// ============================================================================
// Types
// ============================================================================

export interface GuestPerson {
    displayName: string;
    relationshipType: string;
}

export interface GuestContext {
    importanceNote: string; // "Why they matter"
    rawText?: string;      // Pasted chat content
    journalEntry?: string; // "Brain dump" content
    sourceType: 'paste' | 'journal';
}

export interface GuestState {
    userDisplayName: string;
    guestPerson: GuestPerson | null;
    guestContext: GuestContext | null;

    // Actions
    setUserDisplayName: (name: string) => void;
    setGuestPerson: (person: GuestPerson) => void;
    setGuestContext: (context: GuestContext) => void;
    clearGuestData: () => void;

    // Selectors/Computeds
    hasGuestData: () => boolean;
}

// ============================================================================
// Store
// ============================================================================

export const useGuestStore = create<GuestState>()(
    devtools(
        persist(
            (set, get) => ({
                guestPerson: null,
                guestContext: null,
                userDisplayName: '',

                setUserDisplayName: (name) => set({ userDisplayName: name }),
                setGuestPerson: (person) => set({ guestPerson: person }),

                setGuestContext: (context) => set({ guestContext: context }),

                clearGuestData: () => set({ guestPerson: null, guestContext: null, userDisplayName: '' }),

                hasGuestData: () => {
                    const { guestPerson, guestContext, userDisplayName } = get();
                    return !!(guestPerson || guestContext || userDisplayName);
                },
            }),
            {
                name: 'mora-guest-store',
            }
        ),
        { name: 'GuestStore' }
    )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectGuestPerson = (state: GuestState) => state.guestPerson;
export const selectGuestContext = (state: GuestState) => state.guestContext;
export const selectHasGuestData = (state: GuestState) => state.hasGuestData();
