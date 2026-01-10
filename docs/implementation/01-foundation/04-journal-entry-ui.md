# 01-04: Journal Entry UI

**Status:** todo
**Priority:** p1 (high)
**Estimate:** 1w
**Owner:** Unassigned
**Dependencies:** [01-02] (Firebase-MIRA Bridge)

## Context

Core UX for Mora: A frictionless way to write/paste content and get AI analysis. This replaces the old "choose person first" flow with "write anything, topics emerge."

**Related:**
- [VISION.md](../../docs/design/VISION.md#ux-strategy-topic-centric-one-big-journal)
- [Decision: Product Positioning](../../docs/decisions/002-product-positioning.md#ux-changes-from-old-vision)

## Acceptance Criteria

**Home Screen:**
- [ ] Large text area for journal entry
- [ ] Voice input button (uses Web Speech API)
- [ ] "Paste conversation" option (triggers parser)
- [ ] Recent threads shown as cards below input
- [ ] "Patterns this month" preview section

**Entry Creation:**
- [ ] As user types, show character count (no limit, but show "long" warning at 5k+)
- [ ] "Analyzing..." state with spinner while calling `analyzeEntry` function
- [ ] Streaming response (Phase 2) or loading state (Phase 1)
- [ ] Error handling: quota exceeded, MIRA timeout, network error

**Entry Detail View:**
- [ ] Display AI analysis (formatted markdown)
- [ ] Show extracted topics as badges/chips
- [ ] Display related memories (clickable → memory detail)
- [ ] "Related entries" section (links to other entries in same thread)
- [ ] Edit entry button (re-runs analysis)
- [ ] Delete entry button (with confirmation)

**Empty State:**
- [ ] Friendly prompt: "What's on your mind?"
- [ ] Examples: "Paste a tense conversation, journal about a decision, or just write..."

## Technical Notes

### Component Structure

```
apps/web/src/components/journal/
├── JournalEntryForm.tsx       # Main input form
├── VoiceRecorder.tsx          # Voice-to-text
├── ConversationPasteModal.tsx # Paste + parse WhatsApp/Slack
├── AnalysisDisplay.tsx        # Show AI response
├── TopicBadges.tsx            # Topic chips
├── RelatedMemories.tsx        # Memory cards
└── __tests__/
```

### JournalEntryForm.tsx

```typescript
'use client';

import { useState } from 'react';
import { useJournalStore } from '@/lib/stores/journal-store';
import { analyzeEntry } from '@/lib/services/ai-service';

export function JournalEntryForm() {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createEntry = useJournalStore(state => state.createEntry);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeEntry({
        content,
        entryType: 'journal',
      });

      // Save to store
      createEntry({
        id: result.entryId,
        content,
        topics: result.topics,
        analysis: result.analysis,
        surfacedMemories: result.surfacedMemories,
        createdAt: new Date(),
      });

      // Clear form
      setContent('');

      // Navigate to entry detail
      router.push(`/journal/${result.entryId}`);
    } catch (err) {
      if (err.code === 'resource-exhausted') {
        setError('Entry limit reached. Upgrade to Plus for unlimited entries.');
      } else {
        setError('Analysis failed. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        className="w-full min-h-[200px] p-4 border rounded-lg"
        disabled={isAnalyzing}
      />

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {content.length} characters
          {content.length > 5000 && ' (very long)'}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isAnalyzing}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {isAnalyzing ? 'Analyzing...' : 'Unpack This'}
        </button>
      </div>
    </div>
  );
}
```

### Voice Input (Web Speech API)

```typescript
export function VoiceRecorder({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        onTranscript(transcript);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleRecording = () => {
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };

  return (
    <button
      onClick={toggleRecording}
      className={`p-3 rounded-full ${isRecording ? 'bg-red-600' : 'bg-gray-200'}`}
    >
      🎤 {isRecording ? 'Stop' : 'Voice'}
    </button>
  );
}
```

### Zustand Store

```typescript
// apps/web/src/lib/stores/journal-store.ts

interface JournalEntry {
  id: string;
  content: string;
  topics: string[];
  analysis: string;
  surfacedMemories: Memory[];
  createdAt: Date;
}

interface JournalStore {
  entries: JournalEntry[];
  createEntry: (entry: JournalEntry) => void;
  fetchEntries: () => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  entries: [],

  createEntry: (entry) => {
    set(state => ({
      entries: [entry, ...state.entries],
    }));
  },

  fetchEntries: async () => {
    const user = useAuth().user;
    if (!user) return;

    const snapshot = await db
      .collection('journal_entries')
      .where('uid', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as JournalEntry[];

    set({ entries });
  },

  deleteEntry: async (id) => {
    await db.collection('journal_entries').doc(id).delete();
    set(state => ({
      entries: state.entries.filter(e => e.id !== id),
    }));
  },
}));
```

## Testing

### Unit Tests

```typescript
describe('JournalEntryForm', () => {
  it('should disable submit when empty', () => {
    render(<JournalEntryForm />);
    expect(screen.getByText('Unpack This')).toBeDisabled();
  });

  it('should call analyzeEntry on submit', async () => {
    const mockAnalyze = vi.fn().mockResolvedValue({
      entryId: '123',
      analysis: 'Test analysis',
      topics: ['work'],
    });

    render(<JournalEntryForm />);
    const textarea = screen.getByPlaceholderText("What's on your mind?");
    fireEvent.change(textarea, { target: { value: 'Test entry' } });
    fireEvent.click(screen.getByText('Unpack This'));

    await waitFor(() => {
      expect(mockAnalyze).toHaveBeenCalledWith({
        content: 'Test entry',
        entryType: 'journal',
      });
    });
  });

  it('should show error when quota exceeded', async () => {
    const mockAnalyze = vi.fn().mockRejectedValue({ code: 'resource-exhausted' });

    render(<JournalEntryForm />);
    // ... submit
    await waitFor(() => {
      expect(screen.getByText(/Entry limit reached/)).toBeInTheDocument();
    });
  });
});
```

### E2E Test (Playwright)

```typescript
test('create journal entry flow', async ({ page }) => {
  await page.goto('/journal');

  // Write entry
  await page.fill('textarea', 'Had a tough meeting with Sarah today.');
  await page.click('button:has-text("Unpack This")');

  // Wait for analysis
  await page.waitForSelector('text=Analyzing...', { state: 'hidden' });

  // Verify analysis displayed
  await expect(page.locator('.analysis')).toBeVisible();

  // Verify topics extracted
  await expect(page.locator('text=work')).toBeVisible();
  await expect(page.locator('text=Sarah')).toBeVisible();
});
```

## Design Notes

### Visual Design (Tailwind Classes)

- **Input:** Large, inviting, minimal borders
- **Topics:** Pill-shaped badges with soft colors
- **Analysis:** Clean typography, ample whitespace
- **Memories:** Card-based layout, subtle shadows

### Mobile Optimization

- Fixed bottom bar with voice button
- Auto-expand textarea on focus
- Swipe to delete entry
- Pull-to-refresh for recent entries

### Accessibility

- ARIA labels for all interactive elements
- Keyboard shortcuts: `Cmd+Enter` to submit
- Focus management: textarea auto-focus on load
- Screen reader announcements for analysis state

## Rollout Plan

1. Build desktop version first
2. Test with 5 beta users
3. Iterate based on feedback
4. Mobile optimization pass
5. Ship to all users

## Related Beads

- [01-02: Firebase-MIRA Bridge](./02-firebase-mira-bridge.md)
- [01-05: Thread List UI](./05-thread-list-ui.md)
- [02-01: Pattern Dashboard](../02-memory-patterns/01-pattern-dashboard.md)
