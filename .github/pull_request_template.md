## Intent
- Goal:
- Non-goals:
- Risk/rollback:
- Data touched (Auth/Firestore/Storage):

## Plan
- [ ] Design written before coding (short is fine)
- [ ] Smallest shippable slice identified

## Tests
- [ ] Added/updated unit tests
- [ ] Added/updated e2e tests (Playwright) when UX changed
- [ ] At least one test would fail without this PR

## Verification
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run build`
- [ ] `npm run test:unit`
- [ ] `npm run test:e2e`

## Safety
- [ ] No secrets committed
- [ ] No PII in logs
- [ ] AuthZ preserved (per-user `uid` isolation)
- [ ] Rollback path documented (revert/flag)
