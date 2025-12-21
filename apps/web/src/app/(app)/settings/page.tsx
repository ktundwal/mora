"use client";

import { useState } from 'react';
import { Copy, Anchor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';
import { useAuth } from '@/lib/auth-context';
import { useCrypto } from '@/lib/crypto/key-context';
import { deleteAccount } from '@/lib/services/account-service';
import { requestExport, requestDataDelete } from '@/lib/services/export-service';

const actions = [
  {
    title: 'Reveal Recovery Phrase',
    description: 'View your 24-word recovery phrase.',
    handler: 'reveal-key',
  },
  {
    title: 'Export my data',
    description: 'Export a decrypted backup of your data.',
    handler: 'export',
  },
  {
    title: 'Delete my data',
    description: 'Permanently delete all encrypted data.',
    handler: 'delete-data',
  },
  {
    title: 'Delete my account',
    description: 'Delete account and all data.',
    handler: 'delete-account',
  },
  {
    title: 'Sign out',
    description: 'Sign out of your account.',
    handler: 'sign-out',
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useAuth();
  const { revealRecoveryPhrase, hasPassphrase, updateDevicePassphrase } = useCrypto();
  const profile = useUserStore((state) => state.profile);

  const [openDialog, setOpenDialog] = useState<string | null>(null);
  const [revealedPhrase, setRevealedPhrase] = useState<string[] | null>(null);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSetPassphrase = async () => {
    if (!passphraseInput.trim()) return;
    setIsSubmitting(true);
    try {
      await updateDevicePassphrase(passphraseInput);
      setOpenDialog(null);
      setPassphraseInput('');
      toast.success('Device lock enabled');
    } catch (e) {
      toast.error('Failed to set passphrase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePassphrase = async () => {
    setIsSubmitting(true);
    try {
      await updateDevicePassphrase(undefined);
      setOpenDialog(null);
      toast.success('Device lock removed');
    } catch (e) {
      toast.error('Failed to remove passphrase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAction = async (handler: string) => {
    if (!profile?.uid) {
      toast.error('Sign in required');
      return;
    }

    try {
      if (handler === 'reveal-key') {
        const phrase = await revealRecoveryPhrase();
        setRevealedPhrase(phrase);
        setOpenDialog('reveal-key');
        return;
      }

      if (handler === 'export') {
        toast.loading('Requesting export...', { id: 'export' });
        await requestExport();
        toast.success('Export requested. Download link will be emailed.', { id: 'export' });
        return;
      }

      if (handler === 'delete-data') {
        setOpenDialog('delete-data');
        return;
      }

      if (handler === 'delete-account') {
        setOpenDialog('delete-account');
        return;
      }

      if (handler === 'sign-out') {
        await signOut();
        router.push('/');
        return;
      }
    } catch (err) {
      console.error('Settings action failed:', err);
      toast.error('Action failed. Please try again.');
    }
  };

  const confirmAction = async () => {
    if (openDialog === 'delete-data') {
      setOpenDialog(null);
      toast.loading('Deleting data...', { id: 'delete-data' });
      await requestDataDelete();
      toast.success('Delete requested.', { id: 'delete-data' });
    } else if (openDialog === 'delete-account') {
      setOpenDialog(null);
      toast.loading('Deleting account...', { id: 'delete-account' });
      await deleteAccount();
      toast.success('Account deletion requested.', { id: 'delete-account' });
      router.push('/');
    }
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 md:hidden">
            <Anchor className="h-6 w-6 text-zinc-900 dark:text-zinc-100" />
          </div>
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Privacy-first controls. Manage export and deletion.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Device Security</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium">Unlock Phrase</p>
            <p className="text-sm text-muted-foreground">
              Require a password to unlock your data on this device. Recommended for shared devices.
            </p>
          </div>
          <Button 
            variant={hasPassphrase ? "outline" : "default"}
            onClick={() => setOpenDialog(hasPassphrase ? 'remove-passphrase' : 'set-passphrase')}
          >
            {hasPassphrase ? 'Disable' : 'Enable'}
          </Button>
        </CardContent>
      </Card>

      {actions.map((action) => (
        <Card key={action.title}>
          <CardHeader>
            <CardTitle>{action.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {action.handler === 'sign-out' && profile?.email 
                ? `Signed in as ${profile.email}` 
                : action.description}
            </p>
            <Button onClick={() => handleAction(action.handler)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={openDialog === 'reveal-key'} onOpenChange={() => setOpenDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your Recovery Phrase</AlertDialogTitle>
            <AlertDialogDescription>
              Write these words down in order. You need them to access your data on other devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-3 gap-2 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-md font-mono text-xs">
            {revealedPhrase?.map((word, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-zinc-400 select-none">{i + 1}.</span>
                <span className="font-medium select-all">{word}</span>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (revealedPhrase) {
                  navigator.clipboard.writeText(revealedPhrase.join(' '));
                  toast.success('Copied to clipboard');
                }
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Phrase
            </Button>
            <AlertDialogAction onClick={() => {
              setRevealedPhrase(null);
              setOpenDialog(null);
            }}>Done</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openDialog === 'set-passphrase'} onOpenChange={() => setOpenDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Unlock Phrase</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a password to protect your data on this device. You will need to enter this every time you open the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="passphrase">Passphrase</Label>
            <Input 
              id="passphrase" 
              type="password" 
              value={passphraseInput} 
              onChange={(e) => setPassphraseInput(e.target.value)}
              placeholder="Enter passphrase"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleSetPassphrase} disabled={!passphraseInput.trim() || isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Set Phrase'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openDialog === 'remove-passphrase'} onOpenChange={() => setOpenDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Unlock Phrase?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Anyone with access to this device will be able to view your encrypted data without a password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={handleRemovePassphrase} disabled={isSubmitting}>
              {isSubmitting ? 'Removing...' : 'Remove Protection'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={openDialog === 'delete-data' || openDialog === 'delete-account'} onOpenChange={() => setOpenDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {openDialog === 'delete-data'
                ? 'This will permanently delete all your encrypted data. This action cannot be undone.'
                : 'This will permanently delete your account and remove your data from our servers.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
