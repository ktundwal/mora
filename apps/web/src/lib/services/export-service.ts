import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '../firebase';

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
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ reason?: string }, ActionResponse>(functions, 'requestDataDelete');
  const result = await callable({ reason: 'user_request' });
  return result.data;
}
