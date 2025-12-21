'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
    ArrowLeft, 
    ArrowRight, 
    Briefcase, 
    Building2, 
    Heart, 
    Home, 
    Smile, 
    Users,
    MessageSquare,
    BookOpen,
    Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VoiceRecorder } from '@/components/voice-recorder';
import { RELATIONSHIP_GROUPS, RelationshipType } from '@mora/core';
import { useUserStore } from '@/lib/stores/user-store';
import { createPerson } from '@/lib/services/person-service';
import { createConversation } from '@/lib/services/conversation-service';
import { toast } from 'sonner';
import { parseWhatsAppText, type ParsedMessage, type SpeakerMapping } from '@mora/core';

type Step = 1 | 2 | 3 | 4;

function getImportancePlaceholder(type?: string): string {
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

function getEntryPlaceholder(tab: 'paste' | 'journal', type?: string): string {
    const t = type as RelationshipType | undefined;

    if (tab === 'paste') {
        return "[10:30 AM] Them: We need to talk...\n[10:31 AM] Me: About what?\n\n(You can also paste emails!)";
    }

    if (['spouse_wife', 'spouse_husband', 'partner', 'boyfriend', 'girlfriend'].includes(t || '')) {
        return "e.g. They came home late again and didn't say hello. It made me feel...";
    }
    if (['manager', 'mentor'].includes(t || '')) {
        return "e.g. I presented my work but they just criticized the one small error...";
    }
    return "I'm feeling... because...";
}

const IconMap = {
    Heart,
    Briefcase,
    Building2,
    Users,
    Home,
    Smile
};

export default function NewPersonPage() {
    const router = useRouter();
    const { profile } = useUserStore();
    
    const [step, setStep] = useState<Step>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isListening, setIsListening] = useState(false);

    // Form State
    const [selectedGroup, setSelectedGroup] = useState<typeof RELATIONSHIP_GROUPS[number] | null>(null);
    const [name, setName] = useState('');
    const [importance, setImportance] = useState('');
    const [entryType, setEntryType] = useState<'paste' | 'journal'>('journal');
    const [entryContent, setEntryContent] = useState('');

    const handleGroupSelect = (group: typeof RELATIONSHIP_GROUPS[number]) => {
        setSelectedGroup(group);
        setStep(2);
    };

    const handleVoiceInput = (text: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
        setter(prev => {
            const separator = prev.trim() ? ' ' : '';
            return prev + separator + text;
        });
    };

    const handleSubmit = async () => {
        if (!profile?.uid || !selectedGroup || !name.trim()) return;

        try {
            setIsSubmitting(true);

            // 1. Create Person
            const personId = await createPerson({
                uid: profile.uid,
                displayName: name.trim(),
                relationshipType: selectedGroup.types[0] as RelationshipType,
                importanceNote: importance.trim() || null,
            });

            // 2. Create Initial Conversation (if content exists)
            if (entryContent.trim()) {
                let parsedMessages: ParsedMessage[] = [];
                let speakerMapping: SpeakerMapping = {};

                if (entryType === 'paste') {
                    const result = parseWhatsAppText(entryContent);
                    parsedMessages = result.messages;
                    // Heuristic: 1st speaker = Partner
                    result.detectedSpeakers.forEach((s, i) => {
                        speakerMapping[s] = i === 0 ? 'Partner' : 'User';
                    });
                } else {
                    // Journal mode
                    parsedMessages = [{
                        speaker: 'Me',
                        text: entryContent.trim(),
                        timestamp: new Date().toISOString(),
                        rawLine: entryContent.trim(),
                        lineNumber: 1
                    }];
                    speakerMapping = { 'Me': 'User' };
                }

                const title = entryType === 'journal'
                    ? `Journal entry about ${name.trim()}`
                    : `Chat with ${name.trim()}`;

                await createConversation({
                    uid: profile.uid,
                    title,
                    parsedMessages,
                    speakerMapping,
                    personId
                });
            }

            toast.success('Person added successfully');
            router.push(`/people/${personId}`);
        } catch (error) {
            console.error('Failed to create person:', error);
            toast.error('Failed to create person. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Step 1: Relationship Grid
    if (step === 1) {
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

    // Step 2: Name Input
    if (step === 2) {
        return (
            <div className="mx-auto max-w-md px-6 py-8">
                <div className="mb-8 space-y-2">
                    <h1 className="text-2xl font-bold">Who is this person?</h1>
                    <p className="text-zinc-500">
                        You selected <strong>{selectedGroup?.label}</strong>.
                        <button onClick={() => setStep(1)} className="ml-2 text-sm text-blue-600 hover:underline">
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && name.trim()) {
                                    setStep(3);
                                }
                            }}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button variant="ghost" onClick={() => setStep(1)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => setStep(3)}
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

    // Step 3: Importance
    if (step === 3) {
        return (
            <div className="mx-auto max-w-md px-6 py-8">
                <div className="mb-8 space-y-2">
                    <h1 className="text-2xl font-bold">
                        Why does {name} matter?
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
                                onTranscript={(text) => handleVoiceInput(text, setImportance)}
                                isListening={isListening}
                                onListeningChange={setIsListening}
                                className="scale-90 origin-right"
                            />
                        </div>

                        <Textarea
                            id="importance"
                            placeholder={getImportancePlaceholder(selectedGroup?.types[0])}
                            value={importance}
                            onChange={(e) => setImportance(e.target.value)}
                            className="min-h-[150px] resize-none"
                            autoFocus
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button variant="ghost" onClick={() => setStep(2)}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => setStep(4)}
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

    // Step 4: Initial Entry
    return (
        <div className="mx-auto max-w-md px-6 py-8">
            <div className="mb-6 space-y-2">
                <h1 className="text-2xl font-bold">What happened recently?</h1>
                <p className="text-zinc-500">
                    Write down what&apos;s on your mind or paste a conversation/email.
                </p>
            </div>

            <Tabs value={entryType} onValueChange={(v: string) => {
                setEntryType(v as 'paste' | 'journal');
                setEntryContent(''); 
                setIsListening(false);
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
                                placeholder={getEntryPlaceholder('journal', selectedGroup?.types[0])}
                                value={entryContent}
                                onChange={(e) => setEntryContent(e.target.value)}
                                className="min-h-[300px] text-base pb-16 resize-none"
                                autoFocus
                            />
                            <div className="absolute bottom-4 right-4">
                                <VoiceRecorder
                                    onTranscript={(text) => handleVoiceInput(text, setEntryContent)}
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
                            placeholder={getEntryPlaceholder('paste')}
                            value={entryContent}
                            onChange={(e) => setEntryContent(e.target.value)}
                            className="min-h-[300px] font-mono text-sm resize-none"
                            autoFocus
                        />
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Mail className="h-3 w-3" />
                            <span>You can paste emails or chat logs here. Don&apos;t worry about formatting.</span>
                        </div>
                    </TabsContent>

                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setStep(3)} disabled={isSubmitting}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleSubmit}
                            disabled={!entryContent.trim() || isSubmitting}
                        >
                            {isSubmitting ? 'Creating...' : 'Help me think this through'}
                            {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
