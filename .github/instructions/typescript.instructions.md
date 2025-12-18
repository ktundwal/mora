---
description: 'TypeScript coding standards for Mora - strict types, monorepo patterns, no any'
applyTo: '**/*.ts, **/*.tsx'
---

# TypeScript Development Standards

## Type Safety

- **Strict mode always**: No `any`, no `unknown` unless absolutely necessary
- **Shared types**: Import from `@mora/core`, never duplicate locally
- **Explicit return types**: All exported functions must declare return types

## Monorepo Imports

```typescript
// ✅ Correct - import from shared package
import type { UserProfile, Conversation } from '@mora/core';

// ❌ Wrong - local type definition
interface UserProfile { ... }
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Interfaces | PascalCase | `UserProfile`, `Conversation` |
| Types | PascalCase | `SubscriptionTier`, `MessageRole` |
| Functions | camelCase | `parseWhatsApp`, `getUserProfile` |
| Constants | SCREAMING_SNAKE | `FREE_TIER_LIMITS`, `MAX_UNPACKS` |
| Files | kebab-case | `user-store.ts`, `auth-context.tsx` |

## Error Handling

```typescript
// ✅ Always handle Firebase errors
try {
  const doc = await getDoc(docRef);
  if (!doc.exists()) {
    throw new Error('Document not found');
  }
  return doc.data() as UserProfile;
} catch (error) {
  console.error('Failed to fetch user:', error);
  throw error;
}

// ❌ Never ignore errors
const doc = await getDoc(docRef); // Missing error handling
```

## Schema Versioning

All Firestore document types must include `schemaVersion`:

```typescript
export interface UserProfile {
  schemaVersion: 1;
  uid: string;
  // ... other fields
}
```
