# Deployment

## Environments

| Environment | Platform | Trigger | URL |
|-------------|----------|---------|-----|
| **Preview** | Vercel | Every PR | `pr-123.mora.vercel.app` |
| **Dev** | Firebase Hosting | Merge to `main` | `dev.mora.app` |
| **Prod** | Firebase Hosting | GitHub Release tag | `mora.app` |

### Why Hybrid (Vercel + Firebase)?
- **Vercel:** Best-in-class preview deploys, instant feedback per PR
- **Firebase:** Colocation with Functions, single GCP billing

## Firebase Projects
- `dev` (alias): mora-dev
- `prod` (alias): mora-prod

Update `infra/firebase/.firebaserc` with your actual Firebase project IDs.

## Vercel Setup
1. Connect repo to Vercel
2. Set root directory to `apps/web`
3. Set build command: `cd ../.. && npm run build`
4. Add environment variables from `.env.example`
5. Enable preview deploys on PRs

## GitHub Actions auth (Firebase)

Deploy uses GitHub OIDC + Google Cloud Workload Identity Federation (WIF).

Create GitHub Environments named `dev` and `prod` and add these **environment variables** to each:
- `GCP_WORKLOAD_IDENTITY_PROVIDER`: e.g. `projects/123456789/locations/global/workloadIdentityPools/mora-gha/providers/mora-gha`
- `GCP_SERVICE_ACCOUNT_EMAIL`: e.g. `mora-firebase-deployer@mora-dev.iam.gserviceaccount.com`

Recommendation:
- Require manual approval for the `prod` GitHub Environment.

## Deploy behavior

- **PRs:** Vercel preview deploy + CI checks (lint/typecheck/build/test)
- **Merge to `main`:** Deploy to Firebase Hosting (dev) + Functions
- **GitHub Release:** Deploy to Firebase Hosting (prod) + Functions

## Rollback

### Firebase Hosting
```bash
# List recent deploys
firebase hosting:channel:list --project prod

# Rollback to previous version
firebase hosting:clone prod:live prod:rollback-$(date +%s)
firebase hosting:clone prod:PREVIOUS_VERSION_ID prod:live
```

### Emergency: Git Revert
```bash
git revert HEAD --no-edit
git push origin main
# CI will auto-deploy the reverted code
```
