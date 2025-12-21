'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCrypto } from '@/lib/crypto/key-context';
import { useGuestStore } from '@/lib/stores/guest-store';
import { migrateGuestData } from '@/lib/migrate-guest-data';
import { toast } from 'sonner';

export function GuestMigrator() {
  const { user } = useAuth();
  const { status } = useCrypto();
  const hasGuestData = useGuestStore((state) => state.hasGuestData());
  const migratingRef = useRef(false);

  useEffect(() => {
    const runMigration = async () => {
      if (!user || status !== 'ready' || !hasGuestData || migratingRef.current) {
        return;
      }

      migratingRef.current = true;
      const toastId = toast.loading('Migrating your data...');

      try {
        console.log('[GuestMigrator] Starting migration...');
        await migrateGuestData(user.uid);
        toast.success('Data migrated successfully', { id: toastId });
      } catch (error) {
        console.error('[GuestMigrator] Migration failed:', error);
        toast.error('Failed to migrate data', { id: toastId });
      } finally {
        migratingRef.current = false;
      }
    };

    runMigration();
  }, [user, status, hasGuestData]);

  return null;
}
