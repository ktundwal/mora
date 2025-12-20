'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGuestStore } from '@/lib/stores/guest-store';
import { useAuth } from '@/lib/auth-context';

export default function OnboardingIdentityPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { userDisplayName, setUserDisplayName } = useGuestStore();

    // Initialize with safe default
    const [name, setName] = useState('');

    // Hydrate from guest store or Firebase user
    useEffect(() => {
        if (userDisplayName) {
            setName(userDisplayName);
        } else if (user?.displayName) {
            // Pre-fill with Firebase display name for authenticated users
            setName(user.displayName);
            setUserDisplayName(user.displayName);
        }
    }, [userDisplayName, user, setUserDisplayName]);

    const handleNext = () => {
        if (!name.trim()) return;
        setUserDisplayName(name.trim());
        router.push('/onboarding/person');
    };

    return (
        <div className="mx-auto max-w-md px-6 py-8">
            <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-bold">
                    {user ? 'Confirm your name' : 'First, what should we call you?'}
                </h1>
                <p className="text-zinc-500">
                    {user
                        ? 'You can edit this if you prefer a different name or nickname.'
                        : 'This helps Mora personalize the experience for you.'
                    }
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="userName">Your Name</Label>
                    <Input
                        id="userName"
                        placeholder="e.g. Jordan"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus={!user} // Only autofocus for unauthenticated users
                        onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    />
                </div>

                <div className="pt-4 flex gap-3">
                    <Button variant="ghost" onClick={() => router.push(user ? '/people' : '/onboarding')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleNext}
                        disabled={!name.trim()}
                    >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
