/**
 * Person Store
 *
 * Zustand store for managing People list and selection.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Person, RelationshipType } from '@mora/core';
import {
  createPerson as createPersonService,
  getPeople as getPeopleService,
  deletePerson as deletePersonService,
} from '@/lib/services/person-service';
import { useUserStore } from './user-store';

interface PersonState {
  people: Person[];
  isLoading: boolean;
  error: string | null;

  fetchPeople: () => Promise<void>;
  addPerson: (params: {
    displayName: string;
    relationshipType: RelationshipType;
    importanceNote?: string | null;
    profileNotes?: string | null;
  }) => Promise<string>;
  deletePerson: (personId: string) => Promise<void>;
}

export const usePersonStore = create<PersonState>()(
  devtools((set) => ({
    people: [],
    isLoading: false,
    error: null,

    fetchPeople: async () => {
      const { profile } = useUserStore.getState();
      if (!profile?.uid) {
        // Profile may still be loading (AuthProvider fetches/creates it async).
        // Don't surface a hard error here; callers can retry once profile is ready.
        return;
      }

      set({ isLoading: true, error: null });
      try {
        const people = await getPeopleService(profile.uid);
        set({ people, isLoading: false });
      } catch (error) {
        console.error('Failed to fetch people:', error);
        set({ error: 'Failed to load people', isLoading: false });
      }
    },

    addPerson: async ({ displayName, relationshipType, importanceNote, profileNotes }) => {
      const { profile } = useUserStore.getState();
      if (!profile?.uid) throw new Error('Not authenticated');

      const personId = await createPersonService({
        uid: profile.uid,
        displayName,
        relationshipType,
        importanceNote,
        profileNotes,
      });

      // Refresh list
      const people = await getPeopleService(profile.uid);
      set({ people });

      return personId;
    },

    deletePerson: async (personId: string) => {
      const { profile } = useUserStore.getState();
      if (!profile?.uid) throw new Error('Not authenticated');

      await deletePersonService(personId);

      // Remove from local state
      set((state) => ({
        people: state.people.filter((p) => p.id !== personId),
      }));
    },
  }))
);

export const selectPeople = (state: PersonState) => state.people;
export const selectPeopleLoading = (state: PersonState) => state.isLoading;
export const selectPeopleError = (state: PersonState) => state.error;
