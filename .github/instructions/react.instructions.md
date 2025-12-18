---
description: 'React and Next.js patterns for Mora - App Router, shadcn/ui, Zustand'
applyTo: '**/*.tsx, **/app/**/*.ts'
---

# React & Next.js Standards

## Component Patterns

### Use shadcn/ui

```tsx
// ✅ Use shadcn primitives
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// ❌ Don't build custom primitives
const MyButton = styled.button`...`; // Wrong
```

### Client vs Server Components

```tsx
// Server Component (default) - no 'use client'
export default async function ConversationsPage() {
  // Can use async/await, access server resources
}

// Client Component - explicit 'use client'
'use client';
export function ConversationList() {
  const [state, setState] = useState();
  // Interactive, uses hooks
}
```

## State Management

### Zustand for Global State

```tsx
// ✅ Use Zustand stores
import { useUserStore } from '@/lib/stores/user-store';

function Component() {
  const { profile, isPro } = useUserStore();
}

// ❌ Don't use prop drilling for auth state
function Component({ user, isPro, ... }) // Wrong
```

### Forms with react-hook-form + Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Required'),
});

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });
}
```

## Styling

- Use **Tailwind CSS v4** utility classes
- Avoid custom CSS files
- Use `cn()` utility for conditional classes

```tsx
import { cn } from '@/lib/utils';

<div className={cn(
  'p-4 rounded-lg',
  isActive && 'bg-primary text-primary-foreground'
)} />
```

## Icons

Use **lucide-react** only:

```tsx
import { MessageCircle, Settings, User } from 'lucide-react';
```
