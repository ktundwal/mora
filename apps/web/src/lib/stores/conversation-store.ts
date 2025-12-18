/**
 * Conversation Store
 *
 * Zustand store for managing conversations and the new conversation draft.
 * Draft is persisted to localStorage for autosave functionality.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Conversation,
  ParseResult,
  SpeakerMapping,
} from '@mora/core';
import { parseWhatsAppText } from '@mora/core';
import {
  createConversation as createConversationService,
  getConversations as getConversationsService,
  deleteConversation as deleteConversationService,
} from '../services/conversation-service';
import { useUserStore } from './user-store';

// ============================================================================
// Types
// ============================================================================

export type DraftStep = 1 | 2 | 3 | 4;

export interface DraftState {
  rawText: string;
  parseResult: ParseResult | null;
  speakerMapping: SpeakerMapping;
  title: string;
  hasPermission: boolean;
  step: DraftStep;
}

interface ConversationState {
  // Conversations list
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;

  // New conversation draft
  draft: DraftState;

  // List actions
  fetchConversations: () => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;

  // Draft actions
  setDraftText: (text: string) => void;
  parseDraft: () => void;
  setSpeakerMapping: (mapping: SpeakerMapping) => void;
  updateSpeakerMapping: (speaker: string, role: 'User' | 'Partner' | 'Unknown') => void;
  setDraftTitle: (title: string) => void;
  setHasPermission: (value: boolean) => void;
  setStep: (step: DraftStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  saveConversation: () => Promise<string>;
  resetDraft: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialDraft: DraftState = {
  rawText: '',
  parseResult: null,
  speakerMapping: {},
  title: '',
  hasPermission: false,
  step: 1,
};

// ============================================================================
// Store
// ============================================================================

export const useConversationStore = create<ConversationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        conversations: [],
        isLoading: false,
        error: null,
        draft: initialDraft,

        // =====================================================================
        // List Actions
        // =====================================================================

        fetchConversations: async () => {
          const { profile } = useUserStore.getState();
          if (!profile?.uid) {
            set({ error: 'Not authenticated', conversations: [] });
            return;
          }

          set({ isLoading: true, error: null });

          try {
            const conversations = await getConversationsService(profile.uid);
            set({ conversations, isLoading: false });
          } catch (error) {
            console.error('Failed to fetch conversations:', error);
            set({
              error: 'Failed to load conversations',
              isLoading: false,
            });
          }
        },

        deleteConversation: async (id: string) => {
          try {
            await deleteConversationService(id);
            // Remove from local state
            set((state) => ({
              conversations: state.conversations.filter((c) => c.id !== id),
            }));
          } catch (error) {
            console.error('Failed to delete conversation:', error);
            throw error;
          }
        },

        // =====================================================================
        // Draft Actions
        // =====================================================================

        setDraftText: (rawText: string) => {
          set((state) => ({
            draft: { ...state.draft, rawText },
          }));
        },

        parseDraft: () => {
          const { draft } = get();
          const parseResult = parseWhatsAppText(draft.rawText);

          // Auto-generate speaker mapping with first speaker as Partner
          const speakerMapping: SpeakerMapping = {};
          parseResult.detectedSpeakers.forEach((speaker, index) => {
            speakerMapping[speaker] = index === 0 ? 'Partner' : 'User';
          });

          // Auto-generate title
          const title = generateDefaultTitle();

          set((state) => ({
            draft: {
              ...state.draft,
              parseResult,
              speakerMapping,
              title,
            },
          }));
        },

        setSpeakerMapping: (speakerMapping: SpeakerMapping) => {
          set((state) => ({
            draft: { ...state.draft, speakerMapping },
          }));
        },

        updateSpeakerMapping: (speaker: string, role: 'User' | 'Partner' | 'Unknown') => {
          set((state) => ({
            draft: {
              ...state.draft,
              speakerMapping: {
                ...state.draft.speakerMapping,
                [speaker]: role,
              },
            },
          }));
        },

        setDraftTitle: (title: string) => {
          set((state) => ({
            draft: { ...state.draft, title },
          }));
        },

        setHasPermission: (hasPermission: boolean) => {
          set((state) => ({
            draft: { ...state.draft, hasPermission },
          }));
        },

        setStep: (step: DraftStep) => {
          set((state) => ({
            draft: { ...state.draft, step },
          }));
        },

        nextStep: () => {
          set((state) => {
            const nextStep = Math.min(state.draft.step + 1, 4) as DraftStep;
            return { draft: { ...state.draft, step: nextStep } };
          });
        },

        prevStep: () => {
          set((state) => {
            const prevStep = Math.max(state.draft.step - 1, 1) as DraftStep;
            return { draft: { ...state.draft, step: prevStep } };
          });
        },

        saveConversation: async () => {
          const { profile } = useUserStore.getState();
          if (!profile?.uid) {
            throw new Error('Not authenticated');
          }

          const { draft } = get();
          if (!draft.parseResult || draft.parseResult.messages.length === 0) {
            throw new Error('No messages to save');
          }

          const conversationId = await createConversationService({
            uid: profile.uid,
            title: draft.title || generateDefaultTitle(),
            parsedMessages: draft.parseResult.messages,
            speakerMapping: draft.speakerMapping,
          });

          // Reset draft after successful save
          get().resetDraft();

          // Refresh conversations list
          await get().fetchConversations();

          return conversationId;
        },

        resetDraft: () => {
          set({ draft: initialDraft });
        },
      }),
      {
        name: 'mora-conversation-store',
        // Only persist the draft for autosave
        partialize: (state) => ({ draft: state.draft }),
      }
    ),
    { name: 'ConversationStore' }
  )
);

// ============================================================================
// Helpers
// ============================================================================

function generateDefaultTitle(): string {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };
  return `Conversation from ${now.toLocaleDateString('en-US', options)}`;
}

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

export const selectConversations = (state: ConversationState) =>
  state.conversations;
export const selectIsLoading = (state: ConversationState) => state.isLoading;
export const selectDraft = (state: ConversationState) => state.draft;
export const selectDraftStep = (state: ConversationState) => state.draft.step;
export const selectParseResult = (state: ConversationState) =>
  state.draft.parseResult;
export const selectSpeakerMapping = (state: ConversationState) =>
  state.draft.speakerMapping;
