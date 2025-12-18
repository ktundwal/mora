import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UserProfile, SubscriptionTier } from '@mora/core';
import { FREE_TIER_LIMITS } from '@mora/core';

interface UserState {
  // User profile from Firestore
  profile: UserProfile | null;

  // Derived/computed
  isAuthenticated: boolean;
  isPro: boolean;
  tier: SubscriptionTier;

  // Actions
  setProfile: (profile: UserProfile) => void;
  clearProfile: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Usage tracking
  incrementUnpackCount: () => void;
  canUseUnpack: () => boolean;
  remainingUnpacks: () => number;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        profile: null,
        isAuthenticated: false,
        isPro: false,
        tier: 'free',

        setProfile: (profile) =>
          set({
            profile,
            isAuthenticated: true,
            isPro: profile.isPro,
            tier: profile.subscriptionTier,
          }),

        clearProfile: () =>
          set({
            profile: null,
            isAuthenticated: false,
            isPro: false,
            tier: 'free',
          }),

        updateProfile: (updates) =>
          set((state) => {
            if (!state.profile) return state;
            const updated = { ...state.profile, ...updates };
            return {
              profile: updated,
              isPro: updated.isPro,
              tier: updated.subscriptionTier,
            };
          }),

        incrementUnpackCount: () =>
          set((state) => {
            if (!state.profile) return state;
            return {
              profile: {
                ...state.profile,
                unpacksUsedThisMonth: state.profile.unpacksUsedThisMonth + 1,
              },
            };
          }),

        canUseUnpack: () => {
          const { profile, isPro } = get();
          if (!profile) return false;
          if (isPro) return true; // Pro = unlimited

          const limit = FREE_TIER_LIMITS.unpacksPerMonth;
          return profile.unpacksUsedThisMonth < limit;
        },

        remainingUnpacks: () => {
          const { profile, isPro } = get();
          if (!profile) return 0;
          if (isPro) return Infinity;

          const limit = FREE_TIER_LIMITS.unpacksPerMonth;
          return Math.max(0, limit - profile.unpacksUsedThisMonth);
        },
      }),
      {
        name: 'mora-user-store',
        // Only persist non-sensitive data
        partialize: (state) => ({
          isPro: state.isPro,
          tier: state.tier,
        }),
      }
    ),
    { name: 'UserStore' }
  )
);
