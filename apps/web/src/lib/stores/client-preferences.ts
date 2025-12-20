import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OnboardingState = 'new' | 'started' | 'finished';

interface ClientPreferences {
    hasAuthenticatedBefore: boolean;
    onboardingState: OnboardingState;

    setHasAuthenticatedBefore: (value: boolean) => void;
    setOnboardingState: (value: OnboardingState) => void;
}

export const useClientPreferences = create<ClientPreferences>()(
    persist(
        (set) => ({
            hasAuthenticatedBefore: false,
            onboardingState: 'new',

            setHasAuthenticatedBefore: (value) => set({ hasAuthenticatedBefore: value }),
            setOnboardingState: (value) => set({ onboardingState: value }),
        }),
        {
            name: 'mora-client-prefs',
        }
    )
);
