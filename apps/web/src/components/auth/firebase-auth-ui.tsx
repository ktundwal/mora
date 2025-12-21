'use client';

import { useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export default function FirebaseAuthUI() {
  const elementRef = useRef<HTMLDivElement>(null);
  const uiRef = useRef<firebaseui.auth.AuthUI | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !elementRef.current) return;

    // Initialize compat app if not already
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    const auth = firebase.auth();

    // Connect to emulator if needed
    const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
    if (useEmulators) {
        // Check if already connected to avoid errors?
        // Compat SDK doesn't expose a simple "isEmulatorConnected" property easily.
        // But calling useEmulator multiple times might be harmless or throw.
        // We'll assume it's fine or wrap in try/catch.
        try {
            const host = process.env.NEXT_PUBLIC_AUTH_EMULATOR_HOST || '127.0.0.1';
            const port = process.env.NEXT_PUBLIC_AUTH_EMULATOR_PORT || '9099';
            auth.useEmulator(`http://${host}:${port}`);
        } catch (e) {
            // Ignore if already connected
            console.warn('Failed to connect compat auth to emulator (might be already connected):', e);
        }
    }

    const uiConfig: firebaseui.auth.Config = {
      signInFlow: 'popup',
      signInSuccessUrl: '/people',
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
      ],
      callbacks: {
        signInSuccessWithAuthResult: () => {
            return true; 
        },
      },
      tosUrl: '/terms',
      privacyPolicyUrl: '/privacy',
      credentialHelper: firebaseui.auth.CredentialHelper.NONE, // Disable account chooser redirect for cleaner UX
    };

    // Initialize the FirebaseUI Widget using Firebase.
    if (!uiRef.current) {
        uiRef.current = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(auth);
    }
    
    // The start method will wait until the DOM is loaded.
    uiRef.current.start(elementRef.current, uiConfig);

    return () => {
        // Cleanup?
        // uiRef.current?.reset();
    };
  }, []);

  return <div ref={elementRef} className="w-full max-w-md mx-auto" />;
}
