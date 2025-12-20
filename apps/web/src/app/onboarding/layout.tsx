'use client';

import type { ReactNode } from 'react';

/**
 * Onboarding Layout
 *
 * Minimal layout for the onboarding flow. Focuses user attention by removing
 * the main app navigation.
 */
export default function OnboardingLayout({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
            {/* Simple Header */}
            <header className="flex h-16 items-center justify-center px-4">
                <div className="font-bold text-lg">Mora</div>
            </header>

            <main>{children}</main>
        </div>
    );
}
