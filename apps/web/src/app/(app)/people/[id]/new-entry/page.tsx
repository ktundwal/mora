'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, MessageSquare, BookOpen, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceRecorder } from '@/components/voice-recorder';
import { usePersonStore, selectPeople } from '@/lib/stores/person-store';
import { useUserStore } from '@/lib/stores/user-store';
import { createConversation } from '@/lib/services/conversation-service';
import { parseWhatsAppText, type ParsedMessage, type SpeakerMapping } from '@mora/core';

function getPlaceholder(tab: 'paste' | 'journal', displayName: string): string {
    if (tab === 'paste') {
        return `[10:30 AM] ${displayName}: We need to talk...\n[10:31 AM] Me: About what?\n\n(You can also paste emails!)`;
    }
    return `I'm feeling... because...`;
}

export default function NewEntryPage() {
    const router = useRouter();
    const params = useParams();
    const personId = params.id as string;

    const { profile } = useUserStore();
    const people = usePersonStore(selectPeople);

    // Find person
    const person = useMemo(() => people.find(p => p.id === personId), [people, personId]);

    const [activeTab, setActiveTab] = useState<'paste' | 'journal'>('journal');
    const [content, setContent] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Redirect if person not found (after loading check?)
    // Assuming people are loaded by layout/page or cached.
    // If user refreshes here, we might need to fetch.
    const { fetchPeople, isLoading: isLoadingPeople } = usePersonStore();
    useEffect(() => {
        if (profile?.uid && people.length === 0) {
            fetchPeople();
        }
    }, [profile, people.length, fetchPeople]);

    const handleVoiceTranscript = (text: string) => {
        setContent(prev => {
            const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + text;
        });
    };

    const handleSave = async () => {
        if (!content.trim() || !profile?.uid || !person) return;

        setIsSaving(true);
        try {
            let parsedMessages: ParsedMessage[] = [];
            let speakerMapping: SpeakerMapping = {};

            if (activeTab === 'paste') {
                const result = parseWhatsAppText(content);
                parsedMessages = result.messages;

                // Heuristic mapping: First speaker is Partner (Person), others assume User or Unknown
                // We try to match speaker name to person name?
                // For V1, simplest is: 1st detected = Partner
                result.detectedSpeakers.forEach((s, i) => {
                    speakerMapping[s] = i === 0 ? 'Partner' : 'User';
                });
            } else {
                // Journal mode - treat as single User string or "Note"
                // Construct a synthetic message or just store raw text if we had a dedicated "Entry" type?
                // Requirement: "Saves as conversation".
                // We'll create a conversation with one message from "User".
                parsedMessages = [{
                    speaker: 'Me',
                    text: content,
                    timestamp: new Date().toISOString(),
                    rawLine: content,
                    lineNumber: 1
                }];
                speakerMapping = { 'Me': 'User' };
            }

            const title = activeTab === 'journal'
                ? `Journal entry about ${person.displayName}`
                : `Chat with ${person.displayName}`;

            await createConversation({
                uid: profile.uid,
                title,
                parsedMessages,
                speakerMapping,
                personId: person.id
            });

            router.push(`/people/${person.id}`);

        } catch (error) {
            console.error('Failed to create entry:', error);
            setIsSaving(false);
        }
    };

    if (!person) {
        if (isLoadingPeople || !profile?.uid) {
             return (
                <div className="flex min-h-screen items-center justify-center">
                    <div className="text-center">
                        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
                        <p className="mt-4 text-sm text-zinc-500">Loading...</p>
                    </div>
                </div>
            );
        }
        return <div className="p-6 text-center text-zinc-500">Person not found</div>;
    }

    return (
        <div className="mx-auto max-w-md px-6 py-8">
            <div className="mb-6 space-y-2">
                <h1 className="text-2xl font-bold">New Entry for {person.displayName}</h1>
                <p className="text-zinc-500">
                    Write down what's on your mind or paste a conversation.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => {
                setActiveTab(v as 'paste' | 'journal');
                setContent('');
                setIsListening(false);
            }}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="journal" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Journal
                    </TabsTrigger>
                    <TabsTrigger value="paste" className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Paste Chat
                    </TabsTrigger>
                </TabsList>

                <div className="space-y-6">
                    <TabsContent value="journal" className="mt-0 space-y-4">
                        <div className="relative">
                            <Textarea
                                placeholder={getPlaceholder('journal', person.displayName)}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="min-h-[300px] text-base pb-16 resize-none"
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
                    </TabsContent>

                    <TabsContent value="paste" className="mt-0 space-y-4">
                        <Textarea
                            placeholder={getPlaceholder('paste', person.displayName)}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="min-h-[300px] font-mono text-sm resize-none"
                            autoFocus
                        />
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Mail className="h-3 w-3" />
                            <span>You can paste emails or chat logs here.</span>
                        </div>
                    </TabsContent>

                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => router.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSave}
                            disabled={!content.trim() || isSaving}
                        >
                            {isSaving ? 'Saving...' : 'Help me think through'}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
