'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Briefcase, Building2, Heart, Home, Smile, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGuestStore } from '@/lib/stores/guest-store';
import { RELATIONSHIP_GROUPS, RelationshipType } from '@mora/core';


export default function OnboardingPersonPage() {
    const router = useRouter();
    const { guestPerson, setGuestPerson } = useGuestStore();

    // Initialize with safe defaults (Server Match)
    const [mode, setMode] = useState<'select_relationship' | 'input_details'>('select_relationship');
    const [name, setName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<typeof RELATIONSHIP_GROUPS[number] | null>(null);

    // Hydrate from store on client mount
    useEffect(() => {
        if (guestPerson) {
            setMode(guestPerson.relationshipType ? 'input_details' : 'select_relationship');
            setName(guestPerson.displayName || '');
            if (guestPerson.relationshipType) {
                const group = RELATIONSHIP_GROUPS.find(g => (g.types as readonly string[]).includes(guestPerson.relationshipType!));
                if (group) setSelectedGroup(group);
            }
        }
    }, [guestPerson]);

    const handleGroupSelect = (group: typeof RELATIONSHIP_GROUPS[number]) => {
        setSelectedGroup(group);
        setMode('input_details');
    };

    const handleNext = () => {
        if (!name.trim() || !selectedGroup) return;

        setGuestPerson({
            displayName: name.trim(),
            // Default to the first type in the group for now (V1 simplification)
            relationshipType: selectedGroup.types[0] as RelationshipType,
        });

        router.push('/onboarding/context');
    };

    const IconMap = {
        Heart,
        Briefcase,
        Building2,
        Users,
        Home,
        Smile
    };

    if (mode === 'select_relationship') {
        return (
            <div className="mx-auto max-w-lg px-6 py-8">
                <div className="mb-8 space-y-2 text-center">
                    <h1 className="text-2xl font-bold">Who matters to you?</h1>
                    <p className="text-zinc-500">Select the best match.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {RELATIONSHIP_GROUPS.map((group) => {
                        const Icon = IconMap[group.icon as keyof typeof IconMap];
                        return (
                            <button
                                key={group.id}
                                onClick={() => handleGroupSelect(group)}
                                className="flex flex-col items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 active:scale-95 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                            >
                                <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-900">
                                    <Icon className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
                                </div>
                                <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{group.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-md px-6 py-8">
            <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-bold">Who is this person?</h1>
                <p className="text-zinc-500">
                    You selected <strong>{selectedGroup?.label}</strong>.
                    <button onClick={() => setMode('select_relationship')} className="ml-2 text-sm text-blue-600 hover:underline">
                        Change
                    </button>
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name">Their Name</Label>
                    <Input
                        id="name"
                        placeholder="e.g. Alex"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="pt-4 flex gap-3">
                    <Button variant="ghost" onClick={() => setMode('select_relationship')}>
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
