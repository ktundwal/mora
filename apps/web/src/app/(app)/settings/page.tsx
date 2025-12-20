"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { deleteAccount } from '@/lib/services/account-service';
import { requestExport, requestDataDelete } from '@/lib/services/export-service';

const actions = [
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
  const profile = useUserStore((state) => state.profile);

  const [openDialog, setOpenDialog] = useState<string | null>(null);

  const handleAction = async (handler: string) => {
    if (!profile?.uid) {
      toast.error('Sign in required');
      return;
    }

    try {
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
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Privacy-first controls. Manage export and deletion.
        </p>
      </header>

      {actions.map((action) => (
        <Card key={action.title}>
          <CardHeader>
            <CardTitle>{action.title}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">{action.description}</p>
            <Button onClick={() => handleAction(action.handler)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={!!openDialog} onOpenChange={() => setOpenDialog(null)}>
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
