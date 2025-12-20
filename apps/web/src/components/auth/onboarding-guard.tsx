'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';

const ALLOWED_PATHS = ['/setup', '/unlock', '/recover'];

interface OnboardingGuardProps {
    children: ReactNode;
}

export function OnboardingGuard({ children }: OnboardingGuardProps) {
    const { profile } = useUserStore();
    const router = useRouter();
    const pathname = usePathname();

    const isAllowedPath = ALLOWED_PATHS.some(path => pathname.startsWith(path));

    useEffect(() => {
        // If authenticated (profile exists) but onboarding not completed
        if (profile && profile.onboardingCompleted === false && !isAllowedPath) {
            // Redirect to onboarding start
            router.replace('/onboarding');
        }
    }, [profile, router, pathname, isAllowedPath]);

    // If redirecting, don't show children
    if (profile && profile.onboardingCompleted === false && !isAllowedPath) {
        return null;
    }

    return <>{children}</>;
}
