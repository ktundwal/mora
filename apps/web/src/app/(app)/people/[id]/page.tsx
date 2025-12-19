'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, MessageSquare, Trash2, Sparkles, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Conversation, EntryWhy, EntryType, Person, RelationshipType } from '@mora/core';
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
  father: 'Father',
  mother: 'Mother',
  child: 'Child',
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
  const { fetchEntriesForPerson, addEntry, deleteEntry } = useEntryStore();

  const [entryType, setEntryType] = useState<EntryType>('interaction');
  const [entryWhy, setEntryWhy] = useState<EntryWhy>('dont_know_how_to_respond');
  const [whatTheySaid, setWhatTheySaid] = useState('');
  const [whatISaid, setWhatISaid] = useState('');
  const [content, setContent] = useState('');
  const [isSavingEntry, setIsSavingEntry] = useState(false);

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

  const handleAddEntry = async () => {
    setIsSavingEntry(true);
    setError(null);
    try {
      await addEntry({
        personId,
        type: entryType,
        why: entryWhy,
        whatTheySaid: whatTheySaid.trim() ? whatTheySaid.trim() : null,
        whatISaid: whatISaid.trim() ? whatISaid.trim() : null,
        content: content.trim() ? content.trim() : null,
      });

      setWhatTheySaid('');
      setWhatISaid('');
      setContent('');
      setEntryType('interaction');
      setEntryWhy('dont_know_how_to_respond');
    } catch (e) {
      console.error(e);
      setError(`Failed to save entry: ${getErrorMessage(e)}`);
    } finally {
      setIsSavingEntry(false);
    }
  };

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

          <Card>
            <CardContent className="p-4">
              <h2 className="font-medium">New entry</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Capture what happened, in the moment.
              </p>

              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Why are you logging this?</Label>
                  <Select
                    value={entryWhy}
                    onValueChange={(v) => setEntryWhy(v as EntryWhy)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTRY_WHY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Entry type</Label>
                  <Select
                    value={entryType}
                    onValueChange={(v) => setEntryType(v as EntryType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interaction">Interaction</SelectItem>
                      <SelectItem value="brain_dump">Brain dump</SelectItem>
                      <SelectItem value="note">Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {entryType === 'interaction' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="they">What they said (optional)</Label>
                      <Textarea
                        id="they"
                        value={whatTheySaid}
                        onChange={(e) => setWhatTheySaid(e.target.value)}
                        placeholder="Paste or summarize what they said…"
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="me">What I said (optional)</Label>
                      <Textarea
                        id="me"
                        value={whatISaid}
                        onChange={(e) => setWhatISaid(e.target.value)}
                        placeholder="What did you say or do?"
                        className="min-h-[80px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ctx">Anything else (optional)</Label>
                      <Textarea
                        id="ctx"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Context, what you think is really happening…"
                        className="min-h-[80px]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="content">Write it out</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Dump thoughts, paste an email excerpt, paste a transcript…"
                      className="min-h-[140px]"
                    />
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleAddEntry}
                  disabled={isSavingEntry || (!content.trim() && !whatTheySaid.trim() && !whatISaid.trim())}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {isSavingEntry ? 'Saving…' : 'Save entry'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">Entries</h2>
                  <p className="text-sm text-zinc-500">Your recent logs for this person</p>
                </div>
              </div>

              {entriesLoading && entries.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">Loading entries…</div>
              ) : entries.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-500">No entries yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {entries.map((e) => (
                    <div key={e.id} className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">
                          {ENTRY_WHY_OPTIONS.find((o) => o.value === e.why)?.label ?? e.why}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-zinc-400">{new Date(e.createdAt).toLocaleString()}</div>
                          <button
                            type="button"
                            onClick={() => handleDeleteEntry(e.id)}
                            className="p-1 text-zinc-400 hover:text-red-600 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 space-y-2 text-zinc-700 dark:text-zinc-300">
                        {e.whatTheySaid && (
                          <div>
                            <div className="text-xs font-medium text-zinc-500">They said</div>
                            <div className="whitespace-pre-wrap">{e.whatTheySaid}</div>
                          </div>
                        )}
                        {e.whatISaid && (
                          <div>
                            <div className="text-xs font-medium text-zinc-500">I said</div>
                            <div className="whitespace-pre-wrap">{e.whatISaid}</div>
                          </div>
                        )}
                        {e.content && (
                          <div className="whitespace-pre-wrap">{e.content}</div>
                        )}
                      </div>

                      {/* Unpack/Follow-up placeholders */}
                      <div className="mt-3 flex gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="flex-1 opacity-60"
                          title="Coming soon"
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          Unpack
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="flex-1 opacity-60"
                          title="Coming soon"
                        >
                          <Reply className="mr-1.5 h-3.5 w-3.5" />
                          Follow-up
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
