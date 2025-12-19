/**
 * Entry Store
 *
 * Zustand store for creating and listing entries.
 * NOTE: Do not persist entry content to localStorage (sensitive).
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Entry, EntryType, EntryWhy } from '@mora/core';
import {
  createEntry as createEntryService,
  getEntriesForPerson as getEntriesForPersonService,
  deleteEntry as deleteEntryService,
} from '@/lib/services/entry-service';
import { useUserStore } from './user-store';

const EMPTY_ENTRIES: Entry[] = [];

interface EntryState {
  entriesByPersonId: Record<string, Entry[]>;
  isLoading: boolean;
  error: string | null;

  fetchEntriesForPerson: (personId: string) => Promise<void>;
  addEntry: (params: {
    personId: string;
    type: EntryType;
    why: EntryWhy;
    whatTheySaid?: string | null;
    whatISaid?: string | null;
    content?: string | null;
  }) => Promise<string>;
  deleteEntry: (personId: string, entryId: string) => Promise<void>;
}

export const useEntryStore = create<EntryState>()(
  devtools((set, get) => ({
    entriesByPersonId: {},
    isLoading: false,
    error: null,

    fetchEntriesForPerson: async (personId) => {
      set({ isLoading: true, error: null });
      try {
        const entries = await getEntriesForPersonService(personId);
        set((state) => ({
          entriesByPersonId: { ...state.entriesByPersonId, [personId]: entries },
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to fetch entries:', error);
        set({ error: 'Failed to load entries', isLoading: false });
      }
    },

    addEntry: async ({ personId, type, why, whatTheySaid, whatISaid, content }) => {
      const { profile } = useUserStore.getState();
      if (!profile?.uid) {
        const err = new Error('Not authenticated');
        set({ error: err.message });
        throw err;
      }

      set({ error: null });

      try {
        const entryId = await createEntryService({
          uid: profile.uid,
          personId,
          type,
          why,
          whatTheySaid,
          whatISaid,
          content,
        });

        // Refresh that person's entries
        const entries = await getEntriesForPersonService(personId);
        set({
          entriesByPersonId: { ...get().entriesByPersonId, [personId]: entries },
        });

        return entryId;
      } catch (error) {
        console.error('Failed to add entry:', error);
        set({ error: 'Failed to save entry' });
        throw error;
      }
    },

    deleteEntry: async (personId: string, entryId: string) => {
      set({ error: null });

      try {
        await deleteEntryService(personId, entryId);

        // Remove from local state
        set((state) => ({
          entriesByPersonId: {
            ...state.entriesByPersonId,
            [personId]: (state.entriesByPersonId[personId] ?? []).filter(
              (e) => e.id !== entryId
            ),
          },
        }));
      } catch (error) {
        console.error('Failed to delete entry:', error);
        set({ error: 'Failed to delete entry' });
        throw error;
      }
    },
  }))
);

export const selectEntriesForPerson = (personId: string) =>
  (state: EntryState) => state.entriesByPersonId[personId] ?? EMPTY_ENTRIES;

export const selectEntriesLoading = (state: EntryState) => state.isLoading;
export const selectEntriesError = (state: EntryState) => state.error;
