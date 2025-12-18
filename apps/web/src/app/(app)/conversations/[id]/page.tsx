'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Clock, MessageSquare, User, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  getConversation,
  getMessages,
  deleteConversation,
} from '@/lib/services/conversation-service';
import { useUserStore } from '@/lib/stores/user-store';
import type { Conversation, Message } from '@mora/core';

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const profile = useUserStore((state) => state.profile);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!profile?.uid) {
        setError('Not authenticated');
        setIsLoading(false);
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
      } catch (err) {
        console.error('Failed to load conversation:', err);
        setError('Failed to load conversation');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [conversationId, profile?.uid]);

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

      {/* Actions */}
      <div className="sticky bottom-20 z-30 border-t border-zinc-200 bg-white/80 backdrop-blur-sm px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto max-w-2xl">
          <Card className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white dark:from-zinc-800 dark:to-zinc-700">
            <CardContent className="p-4">
              <p className="text-sm font-medium">Ready to understand this conversation?</p>
              <p className="mt-1 text-xs text-zinc-300">
                Get AI-powered insights on communication patterns and how to respond with care.
              </p>
              <Button className="mt-3 w-full bg-white text-zinc-900 hover:bg-zinc-100" size="sm">
                Unpack this Conversation
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
