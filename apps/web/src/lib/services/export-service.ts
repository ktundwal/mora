import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions, getFirebaseDb, getFirebaseAuth } from '../firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch, query, where } from 'firebase/firestore';
import { deleteDeviceKey } from '../crypto/key-store';

interface ActionResponse {
  status: 'queued';
  action: 'export' | 'deleteData';
  message: string;
}

export async function requestExport(): Promise<ActionResponse> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ reason?: string }, ActionResponse>(functions, 'requestExport');
  const result = await callable({ reason: 'user_request' });
  return result.data;
}

export async function requestDataDelete(): Promise<ActionResponse> {
  // Try cloud function first
  try {
    const functions = getFirebaseFunctions();
    const callable = httpsCallable<{ reason?: string }, ActionResponse>(functions, 'requestDataDelete');

    // Set a timeout for the cloud function call
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000));
    const result = await Promise.race([
      callable({ reason: 'user_request' }),
      timeoutPromise
    ]) as { data: ActionResponse };

    return result.data;
  } catch (error) {
    console.warn('Cloud function failed or timed out, falling back to client-side deletion', error);
    await performClientSideDataReset();
    return { status: 'queued', action: 'deleteData', message: 'Data deleted locally.' };
  }
}

/**
 * Fallback to delete data from client side if cloud function is not available.
 * This is useful in development or if the backend is unreachable.
 */
export async function performClientSideDataReset(): Promise<void> {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  const user = auth.currentUser;

  if (!user) throw new Error('No authenticated user');

  // 1. Get all people owned by user
  const peopleRef = collection(db, 'people');
  const q = query(peopleRef, where('uid', '==', user.uid));
  const peopleSnap = await getDocs(q);

  const batch = writeBatch(db);
  let operationCount = 0;
  const MAX_BATCH_SIZE = 450;

  // Helper to commit and reset batch if full
  const checkBatch = async () => {
    operationCount++;
    if (operationCount >= MAX_BATCH_SIZE) {
      await batch.commit();
      operationCount = 0;
    }
  };

  for (const personDoc of peopleSnap.docs) {
    // 2. For each person, find and delete their entries
    const entriesRef = collection(db, 'people', personDoc.id, 'entries');
    const entriesSnap = await getDocs(entriesRef);

    for (const entryDoc of entriesSnap.docs) {
      batch.delete(entryDoc.ref);
      await checkBatch();
    }

    // 3. Delete the person document
    batch.delete(personDoc.ref);
    await checkBatch();
  }

  // Commit any remaining operations
  if (operationCount > 0) {
    await batch.commit();
  }

  // 4. Delete user document
  try {
    await deleteDoc(doc(db, 'users', user.uid));
  } catch (e) {
    console.warn('[ClientReset] Failed to delete user doc', e);
  }

  // 5. Delete local crypto key
  await deleteDeviceKey(user.uid);
}

