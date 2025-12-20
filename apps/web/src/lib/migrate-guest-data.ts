import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { useGuestStore } from './stores/guest-store';
import { createPerson } from './services/person-service';
import { hasActiveCryptoKey } from './crypto/active-key';

/**
 * Manually trigger guest data migration for the current user.
 * This should be called after encryption is set up.
 */
export async function migrateGuestData(uid: string): Promise<void> {
    const guestStore = useGuestStore.getState();

    if (!guestStore.hasGuestData()) {
        console.log('[Migration] No guest data to migrate');
        return;
    }

    if (!hasActiveCryptoKey()) {
        console.error('[Migration] Cannot migrate without encryption key');
        return;
    }

    console.log('[Migration] Starting manual migration');
    const { guestPerson, guestContext } = guestStore;

    let personId: string | null = null;

    // 1. Create Person (encrypted)
    if (guestPerson) {
        try {
            personId = await createPerson({
                uid,
                displayName: guestPerson.displayName,
                relationshipType: guestPerson.relationshipType as any,
                importanceNote: guestContext?.importanceNote || null,
            });
            console.log('[Migration] Successfully migrated person:', personId);

            // 2. Create Initial Entry (Context/Journal)
            if (guestContext?.rawText || guestContext?.journalEntry) {
                const { createEntry } = await import('./services/entry-service');
                const content = guestContext.sourceType === 'paste'
                    ? guestContext.rawText
                    : guestContext.journalEntry;

                if (content) {
                    await createEntry({
                        uid,
                        personId,
                        type: guestContext.sourceType === 'paste' ? 'interaction' : 'brain_dump',
                        why: 'dont_know_how_to_respond', // Default for onboarding
                        content,
                        // If it was a paste, we treat it as generic content for now since we don't parse it yet
                    });
                    console.log('[Migration] Created initial entry from onboarding context');
                }
            }

        } catch (e) {
            console.error('[Migration] Failed to migrate person:', e);
            throw e;
        }
    }

    // Mark onboarding as complete
    try {
        const db = getFirebaseDb();
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, {
            onboardingCompleted: true,
            updatedAt: serverTimestamp(),
        });
        console.log('[Migration] Marked onboarding as complete');
    } catch (e) {
        console.error('[Migration] Failed to update onboarding status:', e);
    }

    guestStore.clearGuestData();
    console.log('[Migration] Guest data migration complete');
}
