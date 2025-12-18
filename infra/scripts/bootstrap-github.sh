#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-dev}"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Usage: $0 [dev|prod]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found. Install GitHub CLI: https://cli.github.com/" >&2
  exit 1
fi

echo "Checking GitHub auth..."
gh auth status >/dev/null

# Determine repo from git remote.
REPO=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null | sed -E 's#(git@github.com:|https://github.com/)([^/]+/[^/.]+)(\.git)?#\2#')

if [[ -z "$REPO" || "$REPO" == *":"* ]]; then
  echo "Could not determine GitHub repo from 'git remote'. Set origin first (git remote add origin ...)." >&2
  exit 1
fi

echo "Using GitHub repo: $REPO"

echo "Creating GitHub environment '$ENVIRONMENT' (requires API; may already exist)"
# GitHub CLI doesn't have a first-class 'create environment' command.
# We'll use the REST API (idempotent).

gh api -X PUT "repos/$REPO/environments/$ENVIRONMENT" >/dev/null

echo "Configuring GitHub Environment variables for Workload Identity Federation"

FIREBASE_DIR="$REPO_ROOT/infra/firebase"
PROJECT_ID=$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('$FIREBASE_DIR/.firebaserc','utf8')); console.log(j.projects['$ENVIRONMENT']||'');")

if [[ -z "$PROJECT_ID" ]]; then
  echo "No project ID configured for '$ENVIRONMENT' in infra/firebase/.firebaserc" >&2
  exit 1
fi

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

POOL_ID="mora-gha"
PROVIDER_ID="mora-gha"
LOCATION="global"

SA_NAME="mora-firebase-deployer"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

WIF_PROVIDER="projects/$PROJECT_NUMBER/locations/$LOCATION/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"

gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER \
  --env "$ENVIRONMENT" \
  --repo "$REPO" \
  --body "$WIF_PROVIDER"

gh variable set GCP_SERVICE_ACCOUNT_EMAIL \
  --env "$ENVIRONMENT" \
  --repo "$REPO" \
  --body "$SA_EMAIL"

echo "GitHub environment variables configured: GCP_WORKLOAD_IDENTITY_PROVIDER, GCP_SERVICE_ACCOUNT_EMAIL"
