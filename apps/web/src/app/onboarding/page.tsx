'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';

export default function OnboardingStartPage() {
    const { loading } = useAuth();

    // Removed unconditional redirect. 
    // Users should only be redirected if they actually have data (handled by OnboardingGuard elsewhere or manual check).
    // If they are here, they probably need to onboard (e.g. after deletion).

    if (loading) return null; // Or a simple spinner

    return (
        <div className="mx-auto flex max-w-md flex-col items-center px-6 py-12 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Let&apos;s get started</h1>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400">
                Let&apos;s start by getting some context.
            </p>

            <div className="mt-12 w-full space-y-4">
                <Button asChild className="w-full text-lg h-12" size="lg">
                    <Link href="/onboarding/identity">
                        Start Unpacking
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
