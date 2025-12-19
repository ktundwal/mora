'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  useConversationStore,
  selectDraft,
  selectDraftStep,
} from '@/lib/stores/conversation-store';
import {
  usePersonStore,
  selectPeople,
  selectPeopleLoading,
} from '@/lib/stores/person-store';
import type { Speaker } from '@mora/core';

export default function NewConversationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draft = useConversationStore(selectDraft);
  const step = useConversationStore(selectDraftStep);
  const {
    setDraftText,
    parseDraft,
    setHasPermission,
    nextStep,
    prevStep,
    updateSpeakerMapping,
    setDraftTitle,
    setDraftPersonId,
    saveConversation,
    resetDraft,
  } = useConversationStore();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const people = usePersonStore(selectPeople);
  const peopleLoading = usePersonStore(selectPeopleLoading);
  const { fetchPeople } = usePersonStore();

  const returnTo = useMemo(
    () => searchParams.get('returnTo') ?? '/conversations',
    [searchParams]
  );

  const progressWidthClass = useMemo(() => {
    switch (step) {
      case 1:
        return 'w-1/4';
      case 2:
        return 'w-1/2';
      case 3:
        return 'w-3/4';
      case 4:
        return 'w-full';
      default:
        return 'w-1/4';
    }
  }, [step]);

  useEffect(() => {
    const personIdParam = searchParams.get('personId');
    const personId = personIdParam && personIdParam.trim() ? personIdParam.trim() : null;
    setDraftPersonId(personId);
  }, [searchParams, setDraftPersonId]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const handleParse = () => {
    if (!draft.rawText.trim()) {
      setError('Please paste some chat text first');
      return;
    }
    if (!draft.hasPermission) {
      setError('Please confirm you have permission to upload this conversation');
      return;
    }
    setError(null);
    parseDraft();
    nextStep();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const conversationId = await saveConversation();
      // REQ-LINK-002: If no personId was set, redirect to link page
      if (!draft.personId) {
        router.push(`/conversations/${conversationId}/link`);
      } else {
        router.push(`/conversations/${conversationId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save conversation');
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 1) {
      // Confirm before discarding content
      if (draft.rawText.trim() && !confirm('Discard this conversation?')) {
        return;
      }
      resetDraft();
      router.push(returnTo);
    } else {
      prevStep();
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">New Conversation</h1>
            <p className="text-sm text-zinc-500">Step {step} of 4</p>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-zinc-100 dark:bg-zinc-800">
        <div
          className={cn(
            'h-full bg-zinc-900 transition-all dark:bg-white',
            progressWidthClass
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {step === 1 && (
            <PasteStep
              rawText={draft.rawText}
              hasPermission={draft.hasPermission}
              onTextChange={setDraftText}
              onPermissionChange={setHasPermission}
              onNext={handleParse}
            />
          )}

          {step === 2 && draft.parseResult && (
            <PreviewStep
              parseResult={draft.parseResult}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {step === 3 && draft.parseResult && (
            <MappingStep
              speakers={draft.parseResult.detectedSpeakers}
              mapping={draft.speakerMapping}
              onUpdateMapping={updateSpeakerMapping}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {step === 4 && (
            <ConfirmStep
              title={draft.title}
              messageCount={draft.parseResult?.messages.length ?? 0}
              onTitleChange={setDraftTitle}
              people={people}
              personId={draft.personId}
              onPersonIdChange={setDraftPersonId}
              peopleLoading={peopleLoading}
              onSave={handleSave}
              onBack={prevStep}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Step Components
// =============================================================================

interface PasteStepProps {
  rawText: string;
  hasPermission: boolean;
  onTextChange: (text: string) => void;
  onPermissionChange: (checked: boolean) => void;
  onNext: () => void;
}

function PasteStep({
  rawText,
  hasPermission,
  onTextChange,
  onPermissionChange,
  onNext,
}: PasteStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Paste your chat</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Copy your WhatsApp conversation and paste it below.
        </p>
      </div>

      <Textarea
        placeholder="Paste your WhatsApp chat here...

Example:
[12/18/24, 10:30 AM] John: Hey, how are you?
[12/18/24, 10:31 AM] Jane: I'm good, thanks!"
        value={rawText}
        onChange={(e) => onTextChange(e.target.value)}
        className="min-h-[300px] font-mono text-sm"
      />

      <div className="flex items-start gap-3">
        <Checkbox
          id="permission"
          checked={hasPermission}
          onCheckedChange={(checked) => onPermissionChange(checked === true)}
        />
        <Label
          htmlFor="permission"
          className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400"
        >
          I have permission to upload and process this conversation. I understand
          this content will be stored securely and used only for my personal use.
        </Label>
      </div>

      <Button
        onClick={onNext}
        className="w-full"
        disabled={!rawText.trim() || !hasPermission}
      >
        Parse & Preview
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

interface PreviewStepProps {
  parseResult: {
    messages: Array<{ speaker: string; text: string; lineNumber: number }>;
    stats: {
      parsedCount: number;
      errorCount: number;
      systemMessagesFiltered: number;
    };
    errors: Array<{ lineNumber: number; rawLine: string; reason: string }>;
  };
  onNext: () => void;
  onBack: () => void;
}

function PreviewStep({ parseResult, onNext, onBack }: PreviewStepProps) {
  const { messages, stats, errors } = parseResult;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Preview</h2>
        <p className="mt-1 text-sm text-zinc-500">
          We found {stats.parsedCount} messages from{' '}
          {new Set(messages.map((m) => m.speaker)).size} speakers.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.parsedCount}</div>
            <div className="text-xs text-zinc-500">Messages</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">
              {new Set(messages.map((m) => m.speaker)).size}
            </div>
            <div className="text-xs text-zinc-500">Speakers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{stats.systemMessagesFiltered}</div>
            <div className="text-xs text-zinc-500">Filtered</div>
          </CardContent>
        </Card>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {errors.length} line(s) couldn&apos;t be parsed
          </p>
          <ul className="mt-2 space-y-1 text-xs text-yellow-700 dark:text-yellow-300">
            {errors.slice(0, 3).map((err, i) => (
              <li key={i} className="truncate">
                Line {err.lineNumber}: {err.rawLine}
              </li>
            ))}
            {errors.length > 3 && (
              <li>...and {errors.length - 3} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Message preview */}
      <div className="max-h-[300px] overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        {messages.slice(0, 20).map((msg, i) => (
          <div
            key={i}
            className={cn(
              'border-b border-zinc-100 p-3 text-sm dark:border-zinc-800',
              'last:border-b-0'
            )}
          >
            <span className="font-medium text-zinc-900 dark:text-white">
              {msg.speaker}:
            </span>{' '}
            <span className="text-zinc-600 dark:text-zinc-400">
              {msg.text.length > 100 ? msg.text.slice(0, 100) + '...' : msg.text}
            </span>
          </div>
        ))}
        {messages.length > 20 && (
          <div className="p-3 text-center text-sm text-zinc-500">
            ...and {messages.length - 20} more messages
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="flex-1" disabled={messages.length === 0}>
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface MappingStepProps {
  speakers: string[];
  mapping: Record<string, Speaker>;
  onUpdateMapping: (speaker: string, role: Speaker) => void;
  onNext: () => void;
  onBack: () => void;
}

function MappingStep({
  speakers,
  mapping,
  onUpdateMapping,
  onNext,
  onBack,
}: MappingStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Who&apos;s who?</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Tell us which speaker is you and which is your partner.
        </p>
      </div>

      <div className="space-y-4">
        {speakers.map((speaker) => (
          <div
            key={speaker}
            className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="font-medium">&ldquo;{speaker}&rdquo;</div>
            <Select
              value={mapping[speaker] || 'Unknown'}
              onValueChange={(value) => onUpdateMapping(speaker, value as Speaker)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="User">Me (User)</SelectItem>
                <SelectItem value="Partner">Partner</SelectItem>
                <SelectItem value="Unknown">Unknown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface ConfirmStepProps {
  title: string;
  messageCount: number;
  onTitleChange: (title: string) => void;
  people: Array<{ id: string; displayName: string }>;
  personId: string | null;
  onPersonIdChange: (personId: string | null) => void;
  peopleLoading: boolean;
  onSave: () => void;
  onBack: () => void;
  isSaving: boolean;
}

function ConfirmStep({
  title,
  messageCount,
  onTitleChange,
  people,
  personId,
  onPersonIdChange,
  peopleLoading,
  onSave,
  onBack,
  isSaving,
}: ConfirmStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Almost there!</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Give your conversation a title and save it.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Conversation Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="e.g., Discussion about weekend plans"
          maxLength={100}
        />
      </div>

      <div className="space-y-2">
        <Label>Link to a person (optional)</Label>
        {peopleLoading ? (
          <div className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-500 dark:border-zinc-800">
            Loading people…
          </div>
        ) : people.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-500 dark:border-zinc-800">
            No people yet. You can link this chat later.
          </div>
        ) : (
          <Select
            value={personId ?? ''}
            onValueChange={(value) => onPersonIdChange(value ? value : null)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Unassigned</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-500">Messages to save</span>
            <span className="font-medium">{messageCount}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onSave} className="flex-1" disabled={isSaving}>
          {isSaving ? (
            'Saving...'
          ) : (
            <>
              Save Conversation
              <Check className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
