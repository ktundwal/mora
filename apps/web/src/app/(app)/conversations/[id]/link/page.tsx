'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, Check, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  usePersonStore,
  selectPeople,
  selectPeopleLoading,
} from '@/lib/stores/person-store';
import { getConversation, updateConversationPerson } from '@/lib/services/conversation-service';
import { useUserStore } from '@/lib/stores/user-store';
import type { Conversation, Person, RelationshipType } from '@mora/core';
import { cn } from '@/lib/utils';

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  self: 'Self',
  manager: 'Manager',
  direct_report: 'Direct report',
  peer: 'Peer',
  mentor: 'Mentor',
  role_model: 'Role model',
  friend: 'Friend',
  spouse_wife: 'Wife',
  spouse_husband: 'Husband',
  partner: 'Partner',
  father: 'Father',
  mother: 'Mother',
  child: 'Child',
  other: 'Other',
};

export default function LinkConversationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conversationId = params.id;

  const { profile } = useUserStore();
  const people = usePersonStore(selectPeople);
  const peopleLoading = usePersonStore(selectPeopleLoading);
  const { fetchPeople } = usePersonStore();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    const loadConversation = async () => {
      if (!profile?.uid) return;

      setIsLoadingConversation(true);
      try {
        const conv = await getConversation(conversationId, profile.uid);
        if (!conv) {
          setError('Conversation not found');
          return;
        }
        setConversation(conv);

        // If already linked, pre-select that person
        if (conv.personId) {
          setSelectedPersonId(conv.personId);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to load conversation');
      } finally {
        setIsLoadingConversation(false);
      }
    };

    loadConversation();
  }, [conversationId, profile?.uid]);

  const handleLink = async () => {
    if (!selectedPersonId) return;

    setIsSaving(true);
    setError(null);
    try {
      await updateConversationPerson(conversationId, selectedPersonId);
      router.push(`/conversations/${conversationId}`);
    } catch (e) {
      console.error(e);
      setError('Failed to link conversation');
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    router.push(`/conversations/${conversationId}`);
  };

  if (isLoadingConversation || peopleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/conversations/${conversationId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold">Link to Person</h1>
            <p className="text-sm text-zinc-500 truncate">
              {conversation?.title ?? 'Conversation'}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                  <Users className="h-5 w-5 text-zinc-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-medium">Who is this conversation about?</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Linking helps you track all conversations with a person in one place.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {people.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                  <Users className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No people yet</h3>
                <p className="mt-1 text-center text-sm text-zinc-500">
                  Add someone first, then come back to link this conversation.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/people">Add a person</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {people.map((person) => (
                  <PersonOption
                    key={person.id}
                    person={person}
                    isSelected={selectedPersonId === person.id}
                    onSelect={() => setSelectedPersonId(person.id)}
                  />
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkip}
                  disabled={isSaving}
                >
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip for now
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleLink}
                  disabled={!selectedPersonId || isSaving}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {isSaving ? 'Linking…' : 'Link conversation'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface PersonOptionProps {
  person: Person;
  isSelected: boolean;
  onSelect: () => void;
}

function PersonOption({ person, isSelected, onSelect }: PersonOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-colors',
        isSelected
          ? 'border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800'
          : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{person.displayName}</div>
          <div className="mt-1 text-xs text-zinc-500">
            {RELATIONSHIP_LABELS[person.relationshipType] ?? person.relationshipType}
          </div>
        </div>
        {isSelected && (
          <div className="rounded-full bg-zinc-900 p-1 dark:bg-white">
            <Check className="h-4 w-4 text-white dark:text-zinc-900" />
          </div>
        )}
      </div>
    </button>
  );
}
