'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Trash2, Clock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  useConversationStore,
  selectConversations,
  selectIsLoading,
} from '@/lib/stores/conversation-store';
import { cn } from '@/lib/utils';
import type { Conversation } from '@mora/core';

export default function ConversationsPage() {
  const conversations = useConversationStore(selectConversations);
  const isLoading = useConversationStore(selectIsLoading);
  const { fetchConversations, deleteConversation } = useConversationStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 mx-auto" />
          <p className="mt-4 text-sm text-zinc-500">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-semibold">Your Conversations</h1>
          <p className="text-sm text-zinc-500">
            {conversations.length === 0
              ? 'Import a chat to get started'
              : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl">
          {conversations.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  onDelete={() => deleteConversation(conversation.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
          <MessageSquare className="h-8 w-8 text-zinc-400" />
        </div>
        <h2 className="mt-4 text-lg font-medium">No conversations yet</h2>
        <p className="mt-1 text-center text-sm text-zinc-500">
          Import your first chat conversation to get started with Mora.
        </p>
        <Button asChild className="mt-6">
          <Link href="/new">Import a Conversation</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface ConversationCardProps {
  conversation: Conversation;
  onDelete: () => void;
}

function ConversationCard({ conversation, onDelete }: ConversationCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      onDelete();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <Link href={`/conversations/${conversation.id}`}>
      <Card
        className={cn(
          'transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50',
          'cursor-pointer'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{conversation.title}</h3>
              {conversation.summary && (
                <p className="mt-1 text-sm text-zinc-500 line-clamp-2">
                  {conversation.summary}
                </p>
              )}
              <div className="mt-2 flex items-center gap-3 text-xs text-zinc-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(conversation.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {conversation.messageCount} messages
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-8 w-8 text-zinc-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <ChevronRight className="h-5 w-5 text-zinc-300" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
