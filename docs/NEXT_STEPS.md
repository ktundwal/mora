# Next Steps

## Priority 1: Connect Real AI Backend
- [ ] **Infrastructure:** Deploy `apps/functions` to Firebase.
- [ ] **AI Integration:** Update `analyzeGuest` in `apps/functions/src/index.ts` to call OpenAI/Anthropic using the `AiProxy` logic.
- [ ] **Cleanup:** Remove the `process.env.NODE_ENV === 'development'` mock block in `apps/web/src/app/onboarding/preview/page.tsx`.

## Priority 2: Landing Page Polish
- [ ] Create/Source animated assets for "Work" and "Life" scenarios.
- [ ] Replace placeholders in `apps/web/src/app/page.tsx`.

## Priority 3: Migration Stability
- [ ] Test the "Save to Unlock" flow with a real new account creation to ensure data is correctly migrated from `localStorage` to Firestore.

## Priority 4: Expansion
- [ ] Implement "Deep Unpack" analysis for authenticated users.
