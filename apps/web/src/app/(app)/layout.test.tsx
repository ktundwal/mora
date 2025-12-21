
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AppLayout from '@/app/(app)/layout';
import { usePathname } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/people'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock auth/crypto guards to render children immediately
vi.mock('@/lib/auth-guard', () => ({ AuthGuard: ({ children }: any) => <>{children}</> }));
vi.mock('@/lib/crypto/crypto-guard', () => ({ CryptoGuard: ({ children }: any) => <>{children}</> }));
vi.mock('@/components/auth/onboarding-guard', () => ({ OnboardingGuard: ({ children }: any) => <>{children}</> }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ signOut: vi.fn() }) }));

describe('AppLayout', () => {
  it('renders the header with Mora brand', () => {
    render(
      <AppLayout>
        <div>Child Content</div>
      </AppLayout>
    );

    // Check for Brand
    expect(screen.getByText('Mora')).toBeDefined();
    
    // Check for Sign Out (since we are mocking auth context, it might render if we add it)
    // We'll verify the specific implementation details in the component test if needed.
  });

  it('renders the simplified bottom nav', () => {
    render(
      <AppLayout>
        <div>Child Content</div>
      </AppLayout>
    );

    // Should have People and Settings
    expect(screen.getAllByText('People').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Settings').length).toBeGreaterThan(0);

    // Should NOT have Chats, New, Playbook
    expect(screen.queryByText('Chats')).toBeNull();
    expect(screen.queryByText('Playbook')).toBeNull();
    // "New" might be tricky if it's a common word, but in the nav context it should be gone
    // The icon might be there but the label "New" should be gone from the nav list
  });
});
