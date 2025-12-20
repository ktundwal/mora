'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Users, PenLine } from 'lucide-react';
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
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">People</h1>
              <p className="text-sm text-zinc-500">
                {isOnboarding
                  ? 'Add someone you want to strengthen a relationship with'
                  : `${people.length} ${people.length === 1 ? 'person' : 'people'}`}
              </p>
            </div>
            {/* 'Add Person' is now a card in the grid, so we remove the header button unless needed for mobile? 
                User said 'quick button to add', but also 'move "New Entry" to last'. 
                For People page, user said 'Add Person' will be a card in this grid. 
                Let's keep header clean or remove the button if the card is sufficient.
                I'll leave it hidden for now to focus on the card action. */}
          </div>
        </div>
      </header>

      <div className="px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Onboarding State - Keep existing large empty state if 0 people? 
              Or just show the grid with one "Add Person" card?
              User said "grid shows people saved so far".
          */}
          {people.length === 0 && !isLoading ? (
            <Card className="border-dashed">
              {/* ... existing empty state ... */}
              <CardContent className="p-4">
                {/* Reuse the existing 'Add a person' form for onboarding vs just a card?
                      For onboarding, the form is nice. Let's keep the form for 0 people state as it reduces friction.
                  */}
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
                {/* ... reusing the existing form content ... */}
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
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {people.map((p) => (
                <div key={p.id} className="relative group">
                  <Link href={`/people/${p.id}`} className="block h-full">
                    <Card className="h-full cursor-pointer transition-all hover:bg-zinc-50 hover:shadow-sm dark:hover:bg-zinc-800/50">
                      <CardContent className="flex h-full flex-col justify-between p-4">
                        <div>
                          <div className="font-medium truncate text-lg">{p.displayName}</div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {RELATIONSHIP_OPTIONS.find((o) => o.value === p.relationshipType)?.label ?? p.relationshipType}
                          </div>
                        </div>

                        <div className="mt-4 flex justify-end">
                          {/* Quick Action: Add Entry */}
                          {/* Prevent navigation to person detail when clicking this button */}
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/people/${p.id}/new-entry`}>
                              <PenLine className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                              <span className="sr-only">Add entry</span>
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              ))}

              {/* Add Person Card (Last) */}
              <Link href="/onboarding/identity" className="block h-full">
                <Card className="h-full border-dashed cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 flex items-center justify-center min-h-[140px]">
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="rounded-full bg-zinc-100 p-3 mb-3 dark:bg-zinc-800">
                      <PlusCircle className="h-6 w-6 text-zinc-400" />
                    </div>
                    <span className="font-medium text-sm text-zinc-600 dark:text-zinc-400">Add Person</span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
