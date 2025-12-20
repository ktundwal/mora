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

export default function SetupPage() {
  const router = useRouter();
  const { status, generateAndStoreKey, recoveryPhrase } = useCrypto();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [localPhrase, setLocalPhrase] = useState<string[] | null>(null);

  useEffect(() => {
    if (status === 'ready') {
      router.replace('/people');
    }
  }, [router, status]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-600">Sign in to set up encryption.</p>
      </div>
    );
  }

  const phraseToShow = localPhrase ?? recoveryPhrase;

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);
    try {
      const phrase = await generateAndStoreKey(passphrase || undefined);
      setLocalPhrase(phrase);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate key');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.replace('/people');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">End-to-end encryption</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Your data will be encrypted client-side. Only you can decrypt it. Write down your recovery phrase.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate your key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passphrase">Device passphrase (optional)</Label>
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Set a passphrase to unlock on this device"
            />
            <p className="text-xs text-gray-500">
              This passphrase protects the key stored on this device. If you skip, the key is still kept in IndexedDB.
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating…' : 'Generate key'}
            </Button>
            {phraseToShow && (
              <Button variant="outline" onClick={handleContinue}>
                Continue to app
              </Button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {phraseToShow && (
            <div className="space-y-2">
              <Label>Your recovery phrase (24 words)</Label>
              <Textarea
                readOnly
                className="h-32 font-mono text-sm"
                value={phraseToShow.join(' ')}
              />
              <p className="text-xs text-amber-600">
                ⚠️ Save this somewhere safe. If you lose it, your data cannot be recovered.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
