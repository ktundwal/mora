import { httpsCallable } from 'firebase/functions';
import type { AiProxyRequest, AiProxyResponse } from '@mora/core';
import { getFirebaseFunctions } from '../firebase';

/**
 * Proxy chat completion through Cloud Functions without exposing provider keys.
 * Content must already be decrypted client-side before calling.
 */
export async function proxyChat(request: AiProxyRequest): Promise<AiProxyResponse> {
  const functions = getFirebaseFunctions();
  const callable = httpsCallable<AiProxyRequest, AiProxyResponse>(functions, 'proxyChat');
  const result = await callable(request);
  return result.data;
}
