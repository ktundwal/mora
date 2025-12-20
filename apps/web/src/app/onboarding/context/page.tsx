'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useGuestStore } from '@/lib/stores/guest-store';
import { VoiceRecorder } from '@/components/voice-recorder';
import { cn } from '@/lib/utils';
import { RelationshipType } from '@mora/core';

function getPlaceholder(type?: string): string {
    // Basic mapping based on relationship groups
    const t = type as RelationshipType | undefined;
    if (!t) return "e.g. Briefly describe the struggle or what you value in this relationship.";

    if (['spouse_wife', 'spouse_husband', 'partner', 'boyfriend', 'girlfriend'].includes(t)) {
        return "e.g. We keep having the same fight about money, but I love them and want to make it work...";
    }
    if (['manager', 'mentor'].includes(t)) {
        return "e.g. I feel micromanaged and it's affecting my confidence. I want to address it without burning bridges.";
    }
    if (['parent', 'father', 'mother', 'sibling', 'child', 'family'].includes(t)) {
        return "e.g. My parent keeps crossing boundaries about my life choices...";
    }
    if (['coworker', 'peer', 'direct_report', 'work_colleague'].includes(t)) {
        return "e.g. There is tension in our project collaboration and I don't know how to address it...";
    }

    return "e.g. Briefly describe the struggle or what you value in this relationship.";
}

export default function OnboardingContextPage() {
    const router = useRouter();
    const { guestPerson, guestContext, setGuestContext } = useGuestStore();

    // Initialize with safe defaults (Server Match)
    const [importance, setImportance] = useState('');
    const [displayName, setDisplayName] = useState('this person');
    const [relationshipType, setRelationshipType] = useState<string | undefined>(undefined);
    const [isListening, setIsListening] = useState(false);

    // Hydrate from store on client mount
    useEffect(() => {
        if (guestContext) {
            setImportance(guestContext.importanceNote || '');
        }
        if (guestPerson) {
            if (guestPerson.displayName) setDisplayName(guestPerson.displayName);
            if (guestPerson.relationshipType) setRelationshipType(guestPerson.relationshipType);
        }
    }, [guestContext, guestPerson]);

    const handleNext = () => {
        if (!importance.trim()) return;

        setGuestContext({
            ...(guestContext || { sourceType: 'paste' }),
            importanceNote: importance.trim(),
        });

        router.push('/onboarding/input');
    };

    const handleVoiceInput = (text: string) => {
        setImportance(prev => {
            const separator = prev.trim() ? ' ' : '';
            return prev + separator + text;
        });
    };

    return (
        <div className="mx-auto max-w-md px-6 py-8">
            <div className="mb-8 space-y-2">
                <h1 className="text-2xl font-bold">
                    Why does {displayName} matter?
                </h1>
                <p className="text-zinc-500">
                    Briefly describe the struggle or what you value in this relationship.
                </p>
            </div>

            <div className="space-y-6">
                <div className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="importance">Your thoughts</Label>
                        <VoiceRecorder
                            onTranscript={handleVoiceInput}
                            isListening={isListening}
                            onListeningChange={setIsListening}
                            className="scale-90 origin-right"
                        />
                    </div>

                    <Textarea
                        id="importance"
                        placeholder={getPlaceholder(relationshipType)}
                        value={importance}
                        onChange={(e) => setImportance(e.target.value)}
                        className={cn(
                            "min-h-[150px] resize-none transition-colors",
                            isListening && "border-red-400 ring-1 ring-red-400 bg-red-50 dark:bg-red-950/20"
                        )}
                        autoFocus
                    />
                </div>

                <div className="pt-4 flex gap-3">
                    <Button variant="ghost" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleNext}
                        disabled={!importance.trim()}
                    >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
