'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Conversation, EntryWhy, Person, RelationshipType } from '@mora/core';
import { getPerson } from '@/lib/services/person-service';
import { getConversationsForPerson } from '@/lib/services/conversation-service';
import {
  useEntryStore,
  selectEntriesForPerson,
  selectEntriesLoading,
} from '@/lib/stores/entry-store';
import { usePersonStore } from '@/lib/stores/person-store';
import { useUserStore } from '@/lib/stores/user-store';

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
  boyfriend: 'Boyfriend',
  girlfriend: 'Girlfriend',
  parent: 'Parent',
  father: 'Father',
  mother: 'Mother',
  sibling: 'Sibling',
  child: 'Child',
  coworker: 'Coworker',
  other: 'Other',
};

const ENTRY_WHY_OPTIONS: Array<{ value: EntryWhy; label: string }> = [
  { value: 'dont_know_how_to_respond', label: "I don't know how to respond" },
  { value: 'feeling_activated', label: 'I feel activated/anxious' },
  { value: 'i_think_i_hurt_them', label: 'I think I hurt them' },
  { value: 'need_to_set_boundary', label: 'I need to set a boundary' },
  { value: 'trying_to_repair', label: "I'm trying to repair" },
  { value: 'saving_for_later', label: 'Just saving for later' },
];

export default function PersonDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const personId = params.id;

  const { profile } = useUserStore();
  const { deletePerson } = usePersonStore();

  const [person, setPerson] = useState<Person | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingPerson, setIsLoadingPerson] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingPerson, setIsDeletingPerson] = useState(false);

  const entriesSelector = useMemo(() => selectEntriesForPerson(personId), [personId]);
  const entries = useEntryStore(entriesSelector);
  const entriesLoading = useEntryStore(selectEntriesLoading);
  const { fetchEntriesForPerson, deleteEntry } = useEntryStore();

  const returnTo = useMemo(() => searchParams.get('returnTo') ?? '/people', [searchParams]);

  const getErrorMessage = (e: unknown): string => {
    if (!e) return 'Unknown error';
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    return 'Unknown error';
  };

  useEffect(() => {
    const run = async () => {
      if (!profile?.uid) return;
      setIsLoadingPerson(true);
      setError(null);
      try {
        const p = await getPerson(personId, profile.uid);
        if (!p) {
          setError('Person not found');
          setPerson(null);
          return;
        }
        setPerson(p);

        const convs = await getConversationsForPerson(profile.uid, personId);
        setConversations(convs);

        await fetchEntriesForPerson(personId);
      } catch (e) {
        console.error(e);
        setError(`Failed to load person: ${getErrorMessage(e)}`);
      } finally {
        setIsLoadingPerson(false);
      }
    };

    run();
  }, [personId, profile?.uid, fetchEntriesForPerson]);



  const handleDeletePerson = async () => {
    if (!confirm(`Delete ${person?.displayName ?? 'this person'}? Their entries will also be deleted.`)) {
      return;
    }

    setIsDeletingPerson(true);
    setError(null);
    try {
      await deletePerson(personId);
      router.push('/people');
    } catch (e) {
      console.error(e);
      setError(`Failed to delete person: ${getErrorMessage(e)}`);
      setIsDeletingPerson(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this entry?')) return;

    try {
      await deleteEntry(personId, entryId);
    } catch (e) {
      console.error(e);
      setError(`Failed to delete entry: ${getErrorMessage(e)}`);
    }
  };

  if (isLoadingPerson && !person) {
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
            <Link href={returnTo}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{person?.displayName ?? 'Person'}</h1>
            <p className="text-sm text-zinc-500">
              {person ? RELATIONSHIP_LABELS[person.relationshipType] : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeletePerson}
            disabled={isDeletingPerson}
            className="text-zinc-400 hover:text-red-600"
            title="Delete person"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {entriesLoading && entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">Loading entries…</div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {/* Entries Grid */}
              {entries.map((e) => (
                <Card key={e.id} className="relative group hover:shadow-sm transition-all dark:hover:bg-zinc-800/50">
                  <CardContent className="flex h-full flex-col justify-between p-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                          {ENTRY_WHY_OPTIONS.find((o) => o.value === e.why)?.label ?? e.why}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(e.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-600 transition-all"
                          title="Delete entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-4">
                        {e.content || e.whatTheySaid || e.whatISaid || 'No content'}
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-zinc-400">
                      {new Date(e.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* New Entry Card (Last) */}
              <Link href={`/people/${personId}/new-entry`} className="block h-full">
                <Card className="h-full border-dashed cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex items-center justify-center min-h-[160px]">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="rounded-full bg-zinc-100 p-3 mb-3 dark:bg-zinc-800">
                      <PlusCircle className="h-6 w-6 text-zinc-400" />
                    </div>
                    <span className="font-medium text-sm text-zinc-600 dark:text-zinc-400">New Entry</span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}

          {/* Entries List Logic Moved to Grid Above - Removing old list */}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">Linked chats</h2>
                  <p className="text-sm text-zinc-500">Chats you imported for this person</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/new?personId=${personId}&returnTo=${encodeURIComponent(`/people/${personId}`)}`}>
                    Import chat
                  </Link>
                </Button>
              </div>

              {conversations.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">
                  No linked chats yet.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {conversations.map((c) => (
                    <Link key={c.id} href={`/conversations/${c.id}`}>
                      <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.title}</div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {c.messageCount} messages
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-zinc-400">{new Date(c.createdAt).toLocaleDateString()}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
