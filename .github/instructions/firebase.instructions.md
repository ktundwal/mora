---
description: 'Firebase patterns for Mora - Firestore, Auth, Cloud Functions'
applyTo: '**/lib/firebase.ts, **/functions/**/*.ts, **/*firebase*.ts'
---

# Firebase Development Standards

## Client SDK (apps/web)

### Lazy Initialization

Firebase client must initialize lazily for SSR safety:

```typescript
// ✅ Correct - lazy initialization
let app: FirebaseApp | null = null;

export function getFirebaseApp() {
  if (typeof window === 'undefined') return null;
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

// ❌ Wrong - top-level initialization
const app = initializeApp(config); // Breaks SSR
```

### Emulator Support

```typescript
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
```

## Firestore Data Model

### User Scoping

All user data must be scoped by `uid`:

```
users/{uid}                    # UserProfile
conversations/{conversationId} # Has uid field
  └── messages/{messageId}     # Inherits from parent
  └── artifacts/{artifactId}
  └── unpacks/{unpackId}
```

### Security Rule Pattern

```javascript
match /conversations/{docId} {
  allow read, write: if request.auth.uid == resource.data.uid;
}
```

## Cloud Functions (apps/functions)

### 2nd Gen Syntax

```typescript
import { onRequest, onCall } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

// HTTP callable
export const generateUnpack = onCall(async (request) => {
  const { conversationId } = request.data;
  // ... implementation
});

// Firestore trigger
export const onConversationCreated = onDocumentCreated(
  'conversations/{conversationId}',
  async (event) => {
    // ... implementation
  }
);
```

### Secrets & Config

```typescript
// ✅ Use defineSecret for sensitive data
import { defineSecret } from 'firebase-functions/params';

const openaiKey = defineSecret('OPENAI_API_KEY');

export const generateUnpack = onCall(
  { secrets: [openaiKey] },
  async (request) => {
    const key = openaiKey.value();
  }
);

// ❌ Never hardcode keys
const key = 'sk-...'; // NEVER DO THIS
```
