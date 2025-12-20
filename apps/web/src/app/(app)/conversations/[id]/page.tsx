'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Clock, MessageSquare, User, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getConversation,
  getMessages,
  deleteConversation,
} from '@/lib/services/conversation-service';
import {
  createReplyDraftFromProxy,
  createUnpackFromProxy,
  getReplyDraftsForConversation,
  getUnpacksForConversation,
  updateReplyDraft,
} from '@/lib/services/unpack-service';
import { useUserStore } from '@/lib/stores/user-store';
import { useCrypto } from '@/lib/crypto/key-context';
import type { Conversation, Message, Unpack, ReplyDraft } from '@mora/core';

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const profile = useUserStore((state) => state.profile);
  const { status: cryptoStatus } = useCrypto();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unpacks, setUnpacks] = useState<Unpack[]>([]);
  const [drafts, setDrafts] = useState<ReplyDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingExtras, setIsLoadingExtras] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingUnpack, setIsGeneratingUnpack] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [unpackStatus, setUnpackStatus] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile?.uid) {
        // Wait for auth
        return;
      }

      if (cryptoStatus !== 'ready') {
        // Wait for crypto
        return;
      }

      try {
        setIsLoading(true);
        const [conv, msgs] = await Promise.all([
          getConversation(conversationId, profile.uid),
          getMessages(conversationId),
        ]);
        if (!conv) {
          setError('Conversation not found');
          return;
        }
        setConversation(conv);
        setMessages(msgs);
        await loadExtras(profile.uid);
      } catch (err) {
        console.error('Failed to load conversation:', err);
        setError('Failed to load conversation');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [conversationId, profile?.uid, cryptoStatus]);

  const loadExtras = async (uid: string) => {
    setIsLoadingExtras(true);
    try {
      const [fetchedUnpacks, fetchedDrafts] = await Promise.all([
        getUnpacksForConversation(conversationId, uid),
        getReplyDraftsForConversation(conversationId, uid),
      ]);
      setUnpacks(fetchedUnpacks);
      setDrafts(fetchedDrafts);
    } catch (err) {
      console.error('Failed to load unpacks/drafts:', err);
    } finally {
      setIsLoadingExtras(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    try {
      await deleteConversation(conversationId);
      router.push('/conversations');
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Failed to delete conversation');
    }
  };

  const handleGenerateUnpack = async () => {
    if (!profile?.uid || !conversation) {
      setError('Not authenticated');
      toast.error('Sign in required');
      return;
    }
    if (messages.length === 0) {
      setUnpackStatus('No messages to analyze yet.');
      toast.info('Add messages before generating an unpack');
      return;
    }

    try {
      setIsGeneratingUnpack(true);
      setUnpackStatus(null);
      const prompt = buildUnpackPrompt(conversation, messages);
      const unpackId = await createUnpackFromProxy({
        uid: profile.uid,
        conversationId,
        prompt,
      });
      setUnpackStatus(`Unpack requested. Reference ID: ${unpackId}`);
      toast.success('Unpack requested');
      await loadExtras(profile.uid);
    } catch (err) {
      console.error('Failed to request unpack:', err);
      setUnpackStatus('Failed to request unpack. Try again.');
      toast.error('Failed to request unpack');
    } finally {
      setIsGeneratingUnpack(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!profile?.uid || !conversation) {
      setError('Not authenticated');
      toast.error('Sign in required');
      return;
    }
    if (messages.length === 0) {
      setDraftStatus('No messages to draft on yet.');
      toast.info('Add messages before drafting');
      return;
    }

    try {
      setIsGeneratingDraft(true);
      setDraftStatus(null);
      const prompt = buildReplyPrompt(conversation, messages);
      const draftId = await createReplyDraftFromProxy({
        uid: profile.uid,
        conversationId,
        prompt,
      });
      setDraftStatus(`Draft requested. Reference ID: ${draftId}`);
      toast.success('Draft requested');
      await loadExtras(profile.uid);
    } catch (err) {
      console.error('Failed to request draft:', err);
      setDraftStatus('Failed to request draft. Try again.');
      toast.error('Failed to request draft');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSaveDraft = async (draftId: string, content: string) => {
    try {
      setDraftStatus('Saving draft…');
      await updateReplyDraft(conversationId, draftId, {
        content,
        isEdited: true,
      });
      await loadExtras(profile?.uid ?? '');
      setDraftStatus('Draft saved.');
      toast.success('Draft saved');
    } catch (err) {
      console.error('Failed to save draft:', err);
      setDraftStatus('Failed to save draft.');
      toast.error('Failed to save draft');
    }
  };

  const handleToggleSent = async (draftId: string, isSent: boolean) => {
    try {
      setDraftStatus('Updating draft…');
      await updateReplyDraft(conversationId, draftId, {
        isSent,
        sentAt: isSent ? new Date().toISOString() : null,
      });
      await loadExtras(profile?.uid ?? '');
      setDraftStatus(isSent ? 'Marked as sent.' : 'Marked as unsent.');
      toast.success(isSent ? 'Marked as sent' : 'Marked as unsent');
    } catch (err) {
      console.error('Failed to update draft:', err);
      setDraftStatus('Failed to update draft.');
      toast.error('Failed to update draft');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
          <p className="mt-4 text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-red-600">{error || 'Conversation not found'}</p>
        <Button variant="outline" onClick={() => router.push('/conversations')} className="mt-4">
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/conversations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{conversation.title}</h1>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDate(conversation.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {messages.length} messages
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleDelete} className="text-zinc-400 hover:text-red-600">
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Summary */}
      {conversation.summary && (
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="mx-auto max-w-2xl">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{conversation.summary}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-3">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </div>

      {/* Unpacks */}
      <div className="border-t border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Unpacks</h2>
            <div className="flex items-center gap-2">
              {isLoadingExtras && <p className="text-xs text-zinc-500">Loading…</p>}
              <Button variant="outline" size="sm" onClick={handleGenerateUnpack} disabled={isGeneratingUnpack}>
                {isGeneratingUnpack ? 'Requesting…' : 'Regenerate'}
              </Button>
            </div>
          </div>
          {unpacks.length === 0 ? (
            <p className="text-sm text-zinc-500">No unpacks yet. Try generating one.</p>
          ) : (
            <div className="space-y-3">
              {unpacks.map((unpack) => (
                <Card key={unpack.id}>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>{formatDate(unpack.createdAt)}</span>
                      <span>{unpack.modelUsed}</span>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Summary</h3>
                      <p className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                        {unpack.summary}
                      </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <SectionList title="Key points" items={unpack.keyPoints} />
                      <SectionList title="Triggers" items={unpack.triggers} />
                      <SectionList title="Harmful actions" items={unpack.harmfulActions} />
                      <SectionList title="Don't say" items={unpack.dontSayList} />
                    </div>
                    {unpack.customSections.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Custom sections</h4>
                        <div className="space-y-2">
                          {unpack.customSections.map((section) => (
                            <SectionList key={section.title} title={section.title} items={section.bullets} />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {unpackStatus && <p className="text-xs text-zinc-500">{unpackStatus}</p>}
        </div>
      </div>

      {/* Drafts */}
      <div className="border-t border-zinc-200 bg-white px-4 py-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Drafts</h2>
            {isLoadingExtras && <p className="text-xs text-zinc-500">Loading…</p>}
          </div>
          {drafts.length === 0 ? (
            <p className="text-sm text-zinc-500">No drafts yet. Generate a reply to get started.</p>
          ) : (
            <div className="space-y-3">
              {drafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onSave={handleSaveDraft}
                  onToggleSent={handleToggleSent}
                />
              ))}
            </div>
          )}
          {draftStatus && <p className="text-xs text-zinc-500">{draftStatus}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="sticky bottom-20 z-30 border-t border-zinc-200 bg-white/80 backdrop-blur-sm px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto max-w-2xl">
          <Card className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white dark:from-zinc-800 dark:to-zinc-700">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Ready to understand this conversation?</p>
              <p className="mt-1 text-xs text-zinc-300">
                Get AI-powered insights on communication patterns and how to respond with care.
              </p>
              <Button
                className="mt-3 w-full bg-white text-zinc-900 hover:bg-zinc-100"
                size="sm"
                onClick={handleGenerateUnpack}
                disabled={isGeneratingUnpack}
              >
                {isGeneratingUnpack ? 'Requesting Unpack…' : 'Unpack this Conversation'}
              </Button>
              <Button
                className="mt-2 w-full border border-white/20 bg-white/10 text-white hover:bg-white/20"
                size="sm"
                onClick={handleGenerateDraft}
                disabled={isGeneratingDraft}
              >
                {isGeneratingDraft ? 'Requesting Draft…' : 'Draft a Reply'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.speaker === 'User';
  const isPartner = message.speaker === 'Partner';

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser && 'justify-end'
      )}
    >
      {!isUser && (
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            isPartner ? 'bg-rose-100 text-rose-600' : 'bg-zinc-200 text-zinc-600'
          )}
        >
          {isPartner ? <Heart className="h-4 w-4" /> : <User className="h-4 w-4" />}
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isUser
            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
            : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        {message.timestamp && (
          <p
            className={cn(
              'mt-1 text-[10px]',
              isUser ? 'text-zinc-400' : 'text-zinc-500'
            )}
          >
            {formatTime(message.timestamp)}
          </p>
        )}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function buildUnpackPrompt(conversation: Conversation, messageList: Message[]): string {
  const transcript = messageList
    .map((msg) => `${msg.speaker}: ${msg.text}`)
    .join('\n');

  return [
    'You are Mora, a concise relationship repair coach.',
    'Create an Unpack summary with what she is communicating, triggers, and what to avoid.',
    `Conversation title: ${conversation.title}`,
    'Transcript:',
    transcript,
  ].join('\n');
}

function buildReplyPrompt(conversation: Conversation, messageList: Message[]): string {
  const transcript = messageList
    .map((msg) => `${msg.speaker}: ${msg.text}`)
    .join('\n');

  return [
    'You are Mora, a concise relationship repair coach.',
    'Write a short reply draft (texting style) that de-escalates and centers her feelings.',
    'Avoid therapy-speak. Offer accountability and calm tone.',
    `Conversation title: ${conversation.title}`,
    'Transcript:',
    transcript,
  ].join('\n');
}

interface DraftCardProps {
  draft: ReplyDraft;
  onSave: (draftId: string, content: string) => Promise<void>;
  onToggleSent: (draftId: string, isSent: boolean) => Promise<void>;
}

function DraftCard({ draft, onSave, onToggleSent }: DraftCardProps) {
  const [content, setContent] = useState(draft.content);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(draft.id, content);
    setIsSaving(false);
  };

  const handleToggleSent = async () => {
    setIsToggling(true);
    await onToggleSent(draft.id, !draft.isSent);
    setIsToggling(false);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>{formatDate(draft.createdAt)}</span>
          <span className="capitalize">{draft.tone.replace('_', ' ')}</span>
        </div>
        <textarea
          className="w-full rounded-md border border-zinc-200 bg-white p-2 text-sm text-zinc-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
          rows={3}
          aria-label="Reply draft"
          placeholder="Edit draft"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save edits'}
          </Button>
          <Button
            variant={draft.isSent ? 'default' : 'outline'}
            size="sm"
            onClick={handleToggleSent}
            disabled={isToggling}
          >
            {isToggling ? 'Updating…' : draft.isSent ? 'Mark unsent' : 'Mark as sent'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SectionListProps {
  title: string;
  items: string[];
}

function SectionList({ title, items }: SectionListProps) {
  return (
    <div className="space-y-1 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</h4>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-500">No items yet.</p>
      ) : (
        <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-900 dark:text-zinc-100">
          {items.map((item) => (
            <li key={item} className="whitespace-pre-wrap">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
