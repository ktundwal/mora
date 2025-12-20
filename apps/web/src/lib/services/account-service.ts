import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from '../firebase';

interface ActionResponse {
  status: 'queued';
  action: 'deleteAccount';
  message: string;
}

export async function deleteAccount(): Promise<ActionResponse> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<{ reason?: string }, ActionResponse>(functions, 'requestAccountDelete');
  const result = await callable({ reason: 'user_request' });
  return result.data;
}
