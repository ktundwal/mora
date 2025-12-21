
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewEntryPage from '@/app/(app)/people/[id]/new-entry/page';
import { usePersonStore } from '@/lib/stores/person-store';
import { useUserStore } from '@/lib/stores/user-store';
import { createConversation } from '@/lib/services/conversation-service';
import { useRouter, useParams } from 'next/navigation';

// Mocks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}));

vi.mock('@/lib/stores/person-store', () => ({
  usePersonStore: vi.fn(),
  selectPeople: (state: any) => state.people,
}));

vi.mock('@/lib/stores/user-store', () => ({
  useUserStore: vi.fn(),
}));

vi.mock('@/lib/services/conversation-service', () => ({
  createConversation: vi.fn(),
}));

vi.mock('@/components/voice-recorder', () => ({
  VoiceRecorder: () => <button>Record</button>,
}));

describe('NewEntryPage', () => {
  const mockPush = vi.fn();
  const mockPerson = { id: 'p1', displayName: 'Partner' };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({ push: mockPush });
    (useParams as any).mockReturnValue({ id: 'p1' });
    (usePersonStore as any).mockReturnValue([mockPerson]); // Mock selectPeople result
    (useUserStore as any).mockReturnValue({ profile: { uid: 'u1' } });
  });

  it('renders the correct button text', () => {
    render(<NewEntryPage />);
    expect(screen.getByText('Help me think through')).toBeDefined();
  });

  it('redirects to person page after save', async () => {
    (createConversation as any).mockResolvedValue('c1');
    
    render(<NewEntryPage />);
    
    // Enter text
    const textareas = screen.getAllByPlaceholderText(/I'm feeling/i);
    const textarea = textareas[0];
    fireEvent.change(textarea, { target: { value: 'Some content' } });
    
    // Click save
    const buttons = screen.getAllByText('Help me think through');
    const button = buttons[0];
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(createConversation).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/people/p1');
    });
  });
});
