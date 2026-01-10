'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, Trash2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Conversation, Person, RelationshipType } from '@mora/core';
import { getPatternsForContext, type CommonPattern } from '@mora/core';
import { getPerson } from '@/lib/services/person-service';
import { getConversationsForPerson } from '@/lib/services/conversation-service';
import { usePersonStore } from '@/lib/stores/person-store';
import { useUserStore } from '@/lib/stores/user-store';
import { PatternList } from '@/components/patterns';

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
  const [showPatterns, setShowPatterns] = useState(false);

  const returnTo = useMemo(() => searchParams.get('returnTo') ?? '/people', [searchParams]);

  // Get relevant patterns based on relationship type
  const relevantPatterns = useMemo((): CommonPattern[] => {
    if (!person) return [];
    const relType = person.relationshipType;
    
    // Map relationship types to pattern contexts
    if (['spouse_wife', 'spouse_husband', 'partner', 'boyfriend', 'girlfriend'].includes(relType)) {
      return getPatternsForContext('romantic');
    }
    if (['parent', 'father', 'mother', 'sibling', 'child'].includes(relType)) {
      return getPatternsForContext('family');
    }
    if (['manager', 'direct_report', 'peer', 'coworker', 'mentor'].includes(relType)) {
      return getPatternsForContext('work');
    }
    if (relType === 'friend') {
      return getPatternsForContext('friendship');
    }
    // Default: show all
    return getPatternsForContext('romantic').slice(0, 4);
  }, [person]);

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
      } catch (e) {
        console.error(e);
        setError(`Failed to load person: ${getErrorMessage(e)}`);
      } finally {
        setIsLoadingPerson(false);
      }
    };

    run();
  }, [personId, profile?.uid]);



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
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 md:static md:border-b-0 md:bg-transparent md:pt-8 md:pb-4">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {conversations.map((c) => (
              <Link key={c.id} href={`/conversations/${c.id}`} className="block">
                <Card className="relative group hover:shadow-sm transition-all dark:hover:bg-zinc-800/50 h-full">
                  <CardContent className="flex h-full flex-col justify-between p-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate pr-4">
                          {c.title || 'Untitled Conversation'}
                        </div>
                        <MessageSquare className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="text-xs text-zinc-500 line-clamp-3">
                        {c.summary || 'No summary available.'}
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-zinc-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
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

          {/* Patterns to Watch Section */}
          {relevantPatterns.length > 0 && (
            <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
              <button
                onClick={() => setShowPatterns(!showPatterns)}
                className="flex items-center justify-between w-full text-left group"
              >
                <div>
                  <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Patterns to watch
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Common behaviors in {
                      ['spouse_wife', 'spouse_husband', 'partner', 'boyfriend', 'girlfriend'].includes(person?.relationshipType ?? '')
                        ? 'romantic relationships'
                        : ['parent', 'father', 'mother', 'sibling', 'child'].includes(person?.relationshipType ?? '')
                          ? 'family relationships'
                          : ['manager', 'direct_report', 'peer', 'coworker', 'mentor'].includes(person?.relationshipType ?? '')
                            ? 'work relationships'
                            : 'relationships'
                    }
                  </p>
                </div>
                <div className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">
                  {showPatterns ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </div>
              </button>
              
              {showPatterns && (
                <div className="mt-4">
                  <PatternList
                    patterns={relevantPatterns.slice(0, 4)}
                    onBookmark={(patternId) => {
                      // TODO: persist to user preferences
                      console.log('[Patterns] User bookmarked:', patternId, 'for person:', personId);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
