'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  usePersonStore,
  selectPeople,
  selectPeopleLoading,
  selectPeopleError,
} from '@/lib/stores/person-store';
import { useUserStore } from '@/lib/stores/user-store';
import { useCrypto } from '@/lib/crypto/key-context';
import type { RelationshipType } from '@mora/core';

const RELATIONSHIP_OPTIONS: Array<{ value: RelationshipType; label: string }> = [
  { value: 'self', label: 'Self' },
  { value: 'partner', label: 'Partner' },
  { value: 'spouse_wife', label: 'Wife' },
  { value: 'spouse_husband', label: 'Husband' },
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'child', label: 'Child' },
  { value: 'friend', label: 'Friend' },
  { value: 'manager', label: 'Manager' },
  { value: 'direct_report', label: 'Direct report' },
  { value: 'peer', label: 'Peer' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'role_model', label: 'Role model' },
  { value: 'other', label: 'Other' },
];

export default function PeoplePage() {
  const people = usePersonStore(selectPeople);
  const isLoading = usePersonStore(selectPeopleLoading);
  const error = usePersonStore(selectPeopleError);
  const { fetchPeople, addPerson } = usePersonStore();

  const { profile } = useUserStore();
  const { status: cryptoStatus } = useCrypto();

  const [displayName, setDisplayName] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('partner');
  const [importanceNote, setImportanceNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile?.uid || cryptoStatus !== 'ready') return;
    fetchPeople();
  }, [fetchPeople, profile?.uid, cryptoStatus]);

  const isOnboarding = useMemo(() => people.length === 0, [people.length]);

  const handleCreate = async () => {
    if (!displayName.trim()) return;
    setIsSaving(true);
    try {
      await addPerson({
        displayName: displayName.trim(),
        relationshipType,
        importanceNote: importanceNote.trim() ? importanceNote.trim() : null,
      });
      setDisplayName('');
      setImportanceNote('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-xl font-semibold">People</h1>
          <p className="text-sm text-zinc-500">
            {isOnboarding
              ? 'Add someone you want to strengthen a relationship with'
              : `${people.length} ${people.length === 1 ? 'person' : 'people'}`}
          </p>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <Card className={isOnboarding ? 'border-dashed' : undefined}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
                  <Users className="h-5 w-5 text-zinc-500" />
                </div>
                <div className="flex-1">
                  <h2 className="font-medium">Add a person</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Start with one person. You can add more anytime.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="person-name">Name</Label>
                  <Input
                    id="person-name"
                    placeholder="e.g., Sam"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select
                    value={relationshipType}
                    onValueChange={(v) => setRelationshipType(v as RelationshipType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="importance">Why they matter (optional)</Label>
                  <Textarea
                    id="importance"
                    placeholder="What do you care about in this relationship?"
                    value={importanceNote}
                    onChange={(e) => setImportanceNote(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={!displayName.trim() || isSaving}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {isSaving ? 'Adding…' : 'Add person'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {isLoading && people.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900" />
                <p className="mt-4 text-sm text-zinc-500">Loading…</p>
              </div>
            </div>
          ) : people.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
                  <Users className="h-8 w-8 text-zinc-400" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No people yet</h3>
                <p className="mt-1 text-center text-sm text-zinc-500">
                  Add someone above to start journaling and linking chats.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {people.map((p) => (
                <Link key={p.id} href={`/people/${p.id}`}>
                  <Card className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.displayName}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {RELATIONSHIP_OPTIONS.find((o) => o.value === p.relationshipType)?.label ?? p.relationshipType}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-zinc-300" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
