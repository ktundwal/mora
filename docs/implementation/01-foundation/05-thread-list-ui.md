# 01-05: Thread List and Detail Views

**Status:** todo
**Priority:** p1 (high)
**Estimate:** 1w
**Owner:** Unassigned
**Dependencies:** [01-04] (Journal Entry UI)

## Context

After the product pivot from "People-centric" to "Topic-centric" organization, we need a Thread-based UI where topics emerge organically from journal entries. This replaces the old "People List" view.

**Related:**
- [ADR-002: Product Positioning](../../decisions/002-product-positioning.md#ux-changes-from-old-vision)
- [ARCHITECTURE-VISION.md](../../design/ARCHITECTURE-VISION.md#frontend-architecture)
- [01-04: Journal Entry UI](./04-journal-entry-ui.md)

## Acceptance Criteria

**Thread List View (`/threads`):**
- [ ] Display all threads grouped by entity type (person, theme, decision, situation)
- [ ] Each thread card shows: title, topics, entry count, last activity
- [ ] Filter by topic tags (multi-select)
- [ ] Search threads by title/content
- [ ] Sort by: recent activity, entry count, creation date
- [ ] Empty state: "No threads yet. Start journaling to create threads."

**Thread Detail View (`/threads/:id`):**
- [ ] Display thread metadata (title, topics, entity type)
- [ ] Chronological list of all entries in thread
- [ ] Related memories section (from MIRA)
- [ ] Pattern insights (if detected by MIRA)
- [ ] "Add Entry" button (creates entry tagged with thread topics)
- [ ] Thread settings: rename, merge, archive

**Navigation:**
- [ ] Sidebar shows thread list (collapsed on mobile)
- [ ] Active thread highlighted
- [ ] Back button to thread list

## Technical Notes

### Component Structure

```
apps/web/src/app/(app)/threads/
├── page.tsx                   # Thread list view
├── [threadId]/
│   └── page.tsx              # Thread detail view
└── components/
    ├── ThreadCard.tsx        # Thread list item
    ├── ThreadGrid.tsx        # Grid layout
    ├── ThreadFilter.tsx      # Filter/search UI
    ├── EntryTimeline.tsx     # Chronological entries
    ├── RelatedMemories.tsx   # MIRA memories
    └── PatternInsights.tsx   # Detected patterns
```

### Firestore Collections

**Thread Schema:**
```typescript
interface Thread {
  id: string;
  uid: string;
  title: string;                // Auto-generated: "Work with Sarah"
  topics: string[];             // ["work", "Sarah", "boundaries"]
  entityType: 'person' | 'theme' | 'decision' | 'situation';
  entryCount: number;
  lastEntryAt: Timestamp;
  miraEntityIds: string[];      // Links to MIRA entities
  createdAt: Timestamp;
  schemaVersion: number;
}
```

**How Threads Are Created:**
- Automatically when `analyzeEntry` extracts entities
- MIRA groups related entities (e.g., "Sarah" + "work" → "Work with Sarah" thread)
- User can manually merge/split threads

### Thread List Page

```typescript
// apps/web/src/app/(app)/threads/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useThreadStore } from '@/lib/stores/thread-store';
import { ThreadGrid } from './components/ThreadGrid';
import { ThreadFilter } from './components/ThreadFilter';

export default function ThreadsPage() {
  const [filter, setFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const threads = useThreadStore(state => state.threads);
  const fetchThreads = useThreadStore(state => state.fetchThreads);

  useEffect(() => {
    fetchThreads();
  }, []);

  const filteredThreads = threads.filter(thread => {
    // Filter by topics
    if (filter.length > 0 && !filter.some(f => thread.topics.includes(f))) {
      return false;
    }

    // Search by title
    if (search && !thread.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }

    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Threads</h1>
        <button
          onClick={() => router.push('/journal')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          New Entry
        </button>
      </div>

      <ThreadFilter
        availableTopics={getAllTopics(threads)}
        selectedTopics={filter}
        onFilterChange={setFilter}
        searchQuery={search}
        onSearchChange={setSearch}
      />

      {filteredThreads.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg">
            No threads yet. Start journaling to create threads.
          </p>
        </div>
      ) : (
        <ThreadGrid threads={filteredThreads} />
      )}
    </div>
  );
}
```

### Thread Detail Page

```typescript
// apps/web/src/app/(app)/threads/[threadId]/page.tsx

'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useThreadStore } from '@/lib/stores/thread-store';
import { useEntryStore } from '@/lib/stores/entry-store';
import { EntryTimeline } from '../components/EntryTimeline';
import { RelatedMemories } from '../components/RelatedMemories';
import { PatternInsights } from '../components/PatternInsights';

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = params.threadId as string;

  const thread = useThreadStore(state =>
    state.threads.find(t => t.id === threadId)
  );
  const entries = useEntryStore(state =>
    state.entries.filter(e => e.threadId === threadId)
  );
  const fetchEntries = useEntryStore(state => state.fetchEntries);

  useEffect(() => {
    if (threadId) {
      fetchEntries(threadId);
    }
  }, [threadId]);

  if (!thread) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span className="capitalize">{thread.entityType}</span>
          <span>•</span>
          <span>{thread.entryCount} entries</span>
        </div>
        <h1 className="text-3xl font-bold mb-4">{thread.title}</h1>
        <div className="flex gap-2">
          {thread.topics.map(topic => (
            <span
              key={topic}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>

      {/* Pattern Insights */}
      {thread.patterns && (
        <PatternInsights patterns={thread.patterns} />
      )}

      {/* Related Memories */}
      <RelatedMemories threadId={threadId} />

      {/* Entries Timeline */}
      <EntryTimeline entries={entries} />

      {/* Add Entry Button */}
      <button
        onClick={() => router.push(`/journal?thread=${threadId}`)}
        className="fixed bottom-6 right-6 px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg"
      >
        + Add Entry
      </button>
    </div>
  );
}
```

### Zustand Store

```typescript
// apps/web/src/lib/stores/thread-store.ts

import { create } from 'zustand';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

interface Thread {
  id: string;
  uid: string;
  title: string;
  topics: string[];
  entityType: 'person' | 'theme' | 'decision' | 'situation';
  entryCount: number;
  lastEntryAt: Date;
  patterns?: Pattern[];
}

interface ThreadStore {
  threads: Thread[];
  isLoading: boolean;
  fetchThreads: () => Promise<void>;
  getThread: (id: string) => Thread | undefined;
  mergeThreads: (sourceId: string, targetId: string) => Promise<void>;
  archiveThread: (id: string) => Promise<void>;
}

export const useThreadStore = create<ThreadStore>((set, get) => ({
  threads: [],
  isLoading: false,

  fetchThreads: async () => {
    const user = useAuth().user;
    if (!user) return;

    set({ isLoading: true });

    const q = query(
      collection(db, 'threads'),
      where('uid', '==', user.uid),
      orderBy('lastEntryAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const threads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      lastEntryAt: doc.data().lastEntryAt.toDate()
    })) as Thread[];

    set({ threads, isLoading: false });
  },

  getThread: (id) => {
    return get().threads.find(t => t.id === id);
  },

  mergeThreads: async (sourceId, targetId) => {
    // Move all entries from source to target
    // Update entry counts
    // Delete source thread
    // TODO: Implement
  },

  archiveThread: async (id) => {
    // Update thread status to 'archived'
    // Remove from active list
    // TODO: Implement
  },
}));
```

## Testing

### Unit Tests

```typescript
describe('ThreadGrid', () => {
  it('should render thread cards', () => {
    const threads = [
      { id: '1', title: 'Work with Sarah', topics: ['work', 'Sarah'], entryCount: 5 },
      { id: '2', title: 'Career anxiety', topics: ['career', 'anxiety'], entryCount: 3 }
    ];

    render(<ThreadGrid threads={threads} />);
    expect(screen.getByText('Work with Sarah')).toBeInTheDocument();
    expect(screen.getByText('Career anxiety')).toBeInTheDocument();
  });

  it('should filter threads by topic', () => {
    // Test filter functionality
  });
});
```

### E2E Tests

```typescript
test('view thread detail and add entry', async ({ page }) => {
  await page.goto('/threads');

  // Click first thread
  await page.click('.thread-card:first-child');

  // Verify thread detail loads
  await expect(page.locator('h1')).toBeVisible();

  // Click "Add Entry" button
  await page.click('button:has-text("Add Entry")');

  // Should navigate to journal with thread pre-selected
  await expect(page).toHaveURL(/\/journal\?thread=/);
});
```

## Design Notes

### Visual Design

**Thread Card:**
- Title (bold, 18px)
- Topics (colored pills)
- Metadata (entry count, last activity)
- Entity type icon (person/theme/decision/situation)

**Thread Detail:**
- Sticky header with thread info
- Timeline of entries (cards with date labels)
- Related memories sidebar (on desktop)
- Pattern insights banner (if applicable)

### Mobile Optimization

- Thread list: Single column, swipe to archive
- Thread detail: Stacked layout, no sidebar
- Floating "Add Entry" button
- Pull-to-refresh

## Rollout Plan

1. Build thread list view (read-only)
2. Test with existing data (migrate from People → Threads)
3. Build thread detail view
4. Add entry creation flow (pre-tag with thread topics)
5. Ship to beta users

## Related Beads

- [01-04: Journal Entry UI](./04-journal-entry-ui.md)
- [02-01: Pattern Dashboard](../02-memory-patterns/01-pattern-dashboard.md) (Phase 2)
