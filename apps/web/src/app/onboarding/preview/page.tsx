'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useGuestStore } from '@/lib/stores/guest-store';
import { getFirebaseFunctions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { GuestAnalysisRequest, GuestAnalysisResponse } from '@mora/core';
import Markdown from 'react-markdown';

export default function OnboardingPreviewPage() {
    const { signInWithGoogle, user } = useAuth();
    const { guestContext, guestPerson } = useGuestStore();
    const [isSigningIn, setIsSigningIn] = useState(false);

    // Note: We don't redirect here anymore. The auth-context will handle
    // redirecting to /setup if encryption isn't set up, or to /people after migration.

    // Analysis State
    const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [analysisResult, setAnalysisResult] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState('');
    const hasAnalyzed = useRef(false);

    useEffect(() => {
        if (hasAnalyzed.current) return;
        hasAnalyzed.current = true;
        setAnalysisStatus('loading');

        // Construct request payload
        const text = guestContext?.sourceType === 'paste'
            ? (guestContext?.rawText || '')
            : (guestContext?.journalEntry || '');

        if (!text) {
            setAnalysisStatus('error');
            setErrorMsg('No content to analyze.');
            return;
        }

        const runAnalysis = async () => {
            try {
                const functions = getFirebaseFunctions();
                const analyzeGuest = httpsCallable<GuestAnalysisRequest, GuestAnalysisResponse>(functions, 'analyzeGuest');
                const result = await analyzeGuest({ text });

                setAnalysisResult(result.data.analysis);
                setAnalysisStatus('success');
            } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('Analysis failed', err);

                // DEV ONLY: Fallback to mock for local verification if function missing
                if (process.env.NODE_ENV === 'development') {
                    setAnalysisResult(`**[DEV MOCK]** Here is a quick perspective... \n\n1. **Core Tension:** Feeling unheard.\n2. **Blind Spot:** Focusing on logic over emotion.`);
                    setAnalysisStatus('success');
                    return;
                }

                // Handle Resource Exhausted (Rate Limit) specially
                if (err.code === 'resource-exhausted') {
                    setErrorMsg('Daily usage limit reached. Sign in for unlimited Analysis.');
                } else {
                    setErrorMsg('Could not run analysis right now. You can still save your data.');
                }
                setAnalysisStatus('error');
            }
        };

        runAnalysis();
    }, [guestContext]);

    const handleSave = async () => {
        if (user) {
            // User is already authenticated - save directly
            setIsSigningIn(true);
            try {
                const { migrateGuestData } = await import('@/lib/migrate-guest-data');
                await migrateGuestData(user.uid);
                // Redirect to people page
                window.location.href = '/people';
            } catch (error) {
                console.error('[Preview] Failed to save:', error);
                setIsSigningIn(false);
            }
        } else {
            // User not authenticated - sign in first
            setIsSigningIn(true);
            try {
                await signInWithGoogle();
                // Auth-context will handle the rest (redirect to setup, then migration)
            } catch (error) {
                console.error('Sign-in failed:', error);
                setIsSigningIn(false);
            }
        }
    };

    return (
        <div className="mx-auto max-w-md px-6 py-8">
            {/* Branding */}
            <div className="mb-6 flex justify-center items-center gap-2 opacity-50">
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold tracking-wide text-sm uppercase">Mora</span>
            </div>

            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold mb-2">
                    {analysisStatus === 'loading' ? 'Thinking...' : 'Here is what I think is happening'}
                </h1>
            </div>

            {/* Analysis Content or Loading State */}
            <Card className="mb-8 overflow-hidden bg-zinc-50 dark:bg-zinc-900/50 p-6 min-h-[200px]">
                {analysisStatus === 'loading' && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        <p className="text-sm text-zinc-500">Finding patterns...</p>
                    </div>
                )}

                {analysisStatus === 'success' && (
                    <div className="prose prose-sm dark:prose-invert text-left">
                        <Markdown>{analysisResult}</Markdown>
                    </div>
                )}

                {analysisStatus === 'error' && (
                    <div className="flex flex-col items-center text-center py-6 space-y-2 text-red-600">
                        <AlertCircle className="h-8 w-8" />
                        <p>{errorMsg}</p>
                    </div>
                )}
            </Card>

            <div className="space-y-6">
                {analysisStatus === 'success' && (
                    <p className="text-center text-zinc-600 dark:text-zinc-400 text-sm px-4">
                        I can help you think better if you save right now and continue so we don&apos;t lose track.
                    </p>
                )}

                <Button
                    size="lg"
                    className="w-full text-lg h-14"
                    onClick={handleSave}
                    disabled={isSigningIn || analysisStatus === 'loading'}
                >
                    {isSigningIn
                        ? (user ? 'Saving...' : 'Connecting...')
                        : (user ? 'Save' : 'Save & Continue')
                    }
                </Button>

                <p className="text-xs text-center text-zinc-400">
                    Your data is encrypted and stored securely.
                </p>
            </div>
        </div>
    );
}
