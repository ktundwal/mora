'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, MessageSquare, BookOpen, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGuestStore, type GuestContext } from '@/lib/stores/guest-store';
import { VoiceRecorder } from '@/components/voice-recorder';
import { RelationshipType } from '@mora/core';

function getPlaceholder(tab: 'paste' | 'journal', type?: string): string {
    const t = type as RelationshipType | undefined;

    if (tab === 'paste') {
        return "Paste the message that triggered you...\n\n[10:30 AM] Them: We need to talk...\n[10:31 AM] Me: About what?";
    }

    // Journal functionality
    if (['spouse_wife', 'spouse_husband', 'partner', 'boyfriend', 'girlfriend'].includes(t || '')) {
        return "e.g. They came home late again and didn't say hello. It made me feel...";
    }
    if (['manager', 'mentor'].includes(t || '')) {
        return "e.g. I presented my work but they just criticized the one small error...";
    }
    return "I'm feeling... because...";
}

export default function OnboardingInputPage() {
    const router = useRouter();
    const { guestContext, guestPerson, setGuestContext } = useGuestStore();

    // Initialize with safe defaults (Server Match) to avoid Hydration Mismatch
    // Default to 'journal' (My Thoughts) to encourage voice/reflection first
    const [activeTab, setActiveTab] = useState<'paste' | 'journal'>('journal');
    const [content, setContent] = useState('');
    const [relationshipType, setRelationshipType] = useState<string | undefined>(undefined);
    const [isListening, setIsListening] = useState(false);

    // Hydrate from store on client mount
    useEffect(() => {
        if (guestContext) {
            setActiveTab(guestContext.sourceType || 'journal');
            setContent(
                guestContext.sourceType === 'paste'
                    ? (guestContext.rawText || '')
                    : (guestContext.journalEntry || '')
            );
        }
        if (guestPerson?.relationshipType) {
            setRelationshipType(guestPerson.relationshipType);
        }
    }, [guestContext, guestPerson]);

    const handleNext = () => {
        if (!content.trim()) return;

        const updatedContext: GuestContext = {
            ...(guestContext!),
            sourceType: activeTab,
            importanceNote: guestContext?.importanceNote || '',
        };

        if (activeTab === 'paste') {
            updatedContext.rawText = content;
            updatedContext.journalEntry = undefined;
        } else {
            updatedContext.journalEntry = content;
            updatedContext.rawText = undefined;
        }

        setGuestContext(updatedContext);
        router.push('/onboarding/preview');
    };

    const handleVoiceTranscript = (text: string) => {
        // Append text with a space if there's existing content
        setContent(prev => {
            const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + text;
        });
    };

    return (
        <div className="mx-auto max-w-md px-6 py-8">
            <div className="mb-6 space-y-2">
                <h1 className="text-2xl font-bold">What happened recently?</h1>
                <p className="text-zinc-500">
                    Write down what's on your mind or paste a conversation/email.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v: string) => {
                setActiveTab(v as 'paste' | 'journal');
                setContent(''); // Clear content on tab switch for simplicity in v1
                setIsListening(false); // Stop listening on switch
            }}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="journal" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        My Thoughts
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Paste Chat/Email
                    </TabsTrigger>
                </TabsList>

                <div className="space-y-6">
                    <TabsContent value="journal" className="mt-0 space-y-4">
                        <div className="relative">
                            <Textarea
                                placeholder={getPlaceholder('journal', relationshipType)}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[300px] text-base pb-16 resize-none" // Extra padding for mic button
                                autoFocus
                            />
                            <div className="absolute bottom-4 right-4">
                                <VoiceRecorder
                                    onTranscript={handleVoiceTranscript}
                                    isListening={isListening}
                                    onListeningChange={setIsListening}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Tip: Speak your mind freely. Mora acts as a sounding board.
                        </p>
                    </TabsContent>

                    <TabsContent value="paste" className="mt-0 space-y-4">
                        <Textarea
                            placeholder={getPlaceholder('paste')}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[300px] font-mono text-sm resize-none"
                            autoFocus
                        />
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Mail className="h-3 w-3" />
                            <span>You can paste emails or chat logs here. Don't worry about formatting.</span>
                        </div>
                    </TabsContent>

                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleNext}
                            disabled={!content.trim()}
                        >
                            Help me think this through
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
