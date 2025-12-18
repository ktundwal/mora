// Centralized exports for lib
// Import from '@/lib' instead of individual files

export { useAuth, AuthProvider } from './auth-context';
export { AuthGuard, withAuthGuard } from './auth-guard';
export { useUserStore } from './stores/user-store';
export { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from './firebase';
export { cn } from './utils';
