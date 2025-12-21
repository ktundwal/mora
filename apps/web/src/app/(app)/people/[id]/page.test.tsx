
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonDetailPage from '@/app/(app)/people/[id]/page';
import { usePersonStore } from '@/lib/stores/person-store';
import { useUserStore } from '@/lib/stores/user-store';
import { useEntryStore, selectEntriesLoading } from '@/lib/stores/entry-store';
import { getPerson } from '@/lib/services/person-service';
import { getConversationsForPerson } from '@/lib/services/conversation-service';

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(() => ({ id: 'p1' })),
  useSearchParams: vi.fn(() => ({ get: () => null })),
}));

vi.mock('@/lib/stores/person-store');
vi.mock('@/lib/stores/user-store');
vi.mock('@/lib/stores/entry-store', () => ({
  useEntryStore: vi.fn(),
  selectEntriesLoading: vi.fn((state: any) => state.loading?.['p1'] ?? false),
  selectEntriesForPerson: vi.fn((id: string) => (state: any) => state.entriesByPerson?.[id] || []),
}));
vi.mock('@/lib/services/person-service');
vi.mock('@/lib/services/conversation-service');

describe('PersonDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUserStore as any).mockReturnValue({ profile: { uid: 'u1' } });
    (usePersonStore as any).mockReturnValue({ deletePerson: vi.fn() });
    (useEntryStore as any).mockReturnValue({ 
      fetchEntriesForPerson: vi.fn(),
      deleteEntry: vi.fn()
    }); // entries
    (useEntryStore as any).setState = vi.fn();
    // We also need to mock the selector usage
    // The component uses: const entries = useEntryStore(entriesSelector);
    // But since we mock the whole hook, it returns the object above, not the entries array.
    // This is tricky with zustand mocks.
    // Better to mock the module to return a function that handles selectors or just returns state.
    
    // Let's simplify: The component calls useEntryStore(selector) AND useEntryStore().
    // We need to handle both.
    const mockState = {
      entriesByPerson: { 'p1': [] },
      loading: { 'p1': false },
      fetchEntriesForPerson: vi.fn(),
      deleteEntry: vi.fn()
    };

    const useEntryStoreMock = vi.fn((selector) => {
      if (typeof selector === 'function') {
        const result = selector(mockState);
        // console.log('useEntryStore selector result:', result);
        return result;
      }
      return mockState;
    });
    // Add static properties if needed
    (useEntryStoreMock as any).getState = vi.fn();
    
    // Re-mock the module
    vi.mocked(useEntryStore).mockImplementation(useEntryStoreMock as any);
    (getPerson as any).mockResolvedValue({ id: 'p1', displayName: 'Partner', relationshipType: 'partner' });
    (getConversationsForPerson as any).mockResolvedValue([{ id: 'c1', title: 'Chat 1' }]);
  });

  it('does NOT render Linked Chats section', async () => {
    // We need to wait for useEffect to run, but since we mock services, it should be fast.
    // However, the component has loading state.
    
    // Mock useState for loading to be false initially if possible, or wait.
    // The component starts with isLoadingPerson = true.
    
    render(<PersonDetailPage />);
    
    // Wait for loading to finish (person name appears)
    await screen.findAllByText('Partner');
    
    // Check that "Linked chats" is NOT present
    expect(screen.queryByText('Linked chats')).toBeNull();
  });
});
