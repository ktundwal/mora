'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCrypto } from '@/lib/crypto/key-context';
import { useAuth } from '@/lib/auth-context';

export default function UnlockPage() {
  const router = useRouter();
  const { status, unlockWithPassphrase } = useCrypto();
  const { user } = useAuth();
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
        <p className="text-sm text-gray-600">Sign in to unlock.</p>
      </div>
    );
  }

  const handleUnlock = async () => {
    setError(null);
    setLoading(true);
    try {
      await unlockWithPassphrase(passphrase);
      router.replace('/people');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to unlock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Unlock encrypted data</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Enter the device passphrase you set during encryption setup.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unlock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase</Label>
            <Input
              id="passphrase"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              placeholder="Enter your device passphrase"
            />
          </div>

          <Button onClick={handleUnlock} disabled={loading || !passphrase}>
            {loading ? 'Unlocking…' : 'Unlock'}
          </Button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-gray-500">
            Forgot it? Use your 24-word recovery phrase instead.
          </p>
          <Button variant="outline" onClick={() => router.replace('/recover')}>
            Recover with phrase
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
