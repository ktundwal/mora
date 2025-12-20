'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCrypto } from '@/lib/crypto/key-context';
import { useAuth } from '@/lib/auth-context';

function parsePhrase(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

export default function RecoverPage() {
  const router = useRouter();
  const { status, recoverWithPhrase } = useCrypto();
  const { user } = useAuth();
  const [phraseInput, setPhraseInput] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'ready') {
      router.replace('/people');
    }
  }, [router, status]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-600">Sign in to recover access.</p>
      </div>
    );
  }

  const handleRecover = async () => {
    setError(null);
    setLoading(true);
    try {
      const words = parsePhrase(phraseInput);
      if (words.length !== 24) {
        throw new Error('Recovery phrase must be 24 words');
      }
      await recoverWithPhrase(words, passphrase || undefined);
      router.replace('/people');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to recover');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Recover encrypted data</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Enter your 24-word recovery phrase to restore your encryption key on this device.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recovery phrase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phrase">24-word phrase</Label>
            <Textarea
              id="phrase"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
              placeholder="Enter all 24 words separated by spaces"
              className="h-32 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="passphrase">Set device passphrase (optional)</Label>
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Set a passphrase for this device"
            />
          </div>

          <Button onClick={handleRecover} disabled={loading || phraseInput.trim().length === 0}>
            {loading ? 'Recovering…' : 'Recover'}
          </Button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
