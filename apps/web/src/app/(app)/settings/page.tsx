"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/lib/stores/user-store';
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
];

export default function SettingsPage() {
  const router = useRouter();
  const profile = useUserStore((state) => state.profile);

  const handleAction = async (handler: string) => {
    if (!profile?.uid) {
      toast.error('Sign in required');
      return;
    }

    try {
      if (handler === 'export') {
        toast.loading('Requesting export...', { id: 'export' });
        await requestExport();
        toast.success('Export requested. We will prepare your download link.', { id: 'export' });
        return;
      }

      if (handler === 'delete-data') {
        if (!confirm('Delete all your data? This cannot be undone.')) return;
        toast.loading('Deleting data...', { id: 'delete-data' });
        await requestDataDelete();
        toast.success('Delete requested. We will process shortly.', { id: 'delete-data' });
        return;
      }

      if (handler === 'delete-account') {
        if (!confirm('Delete your account and all data? This cannot be undone.')) return;
        toast.loading('Deleting account...', { id: 'delete-account' });
        await deleteAccount();
        toast.success('Account deletion requested. You will be signed out.', { id: 'delete-account' });
        router.push('/');
        return;
      }
    } catch (err) {
      console.error('Settings action failed:', err);
      toast.error('Action failed. Please try again.');
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
    </main>
  );
}
