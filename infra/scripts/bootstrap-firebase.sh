#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-dev}"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Usage: $0 [dev|prod]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FIREBASE_DIR="$REPO_ROOT/infra/firebase"

# Determine repo from git remote (needed for Workload Identity Federation conditions).
REPO=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null | sed -E 's#(git@github.com:|https://github.com/)([^/]+/[^/.]+)(\.git)?#\2#')

if [[ -z "$REPO" || "$REPO" == *":"* ]]; then
  echo "Could not determine GitHub repo from 'git remote'. Set origin first (git remote add origin ...)." >&2
  exit 1
fi

PROJECT_ID=$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('$FIREBASE_DIR/.firebaserc','utf8')); console.log(j.projects['$ENVIRONMENT']||'');")

if [[ -z "$PROJECT_ID" ]]; then
  echo "No project ID configured for '$ENVIRONMENT' in infra/firebase/.firebaserc" >&2
  exit 1
fi

echo "Using Firebase project '$PROJECT_ID' for env '$ENVIRONMENT'"
echo "Using GitHub repo '$REPO' for Workload Identity Federation"

echo "Checking gcloud auth..."
gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null

echo "Enabling required APIs (best-effort)..."
# Some APIs may already be enabled; ignore failures where appropriate.
set +e
# Firestore/Datastore
#gcloud services enable firestore.googleapis.com --project "$PROJECT_ID"
# Identity Toolkit (Firebase Auth)
#gcloud services enable identitytoolkit.googleapis.com --project "$PROJECT_ID"
# Cloud Resource Manager
#gcloud services enable cloudresourcemanager.googleapis.com --project "$PROJECT_ID"
set -e

echo "Creating deploy service account (idempotent-ish)..."
SA_NAME="mora-firebase-deployer"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT_ID" --display-name "mora firebase deployer"
else
  echo "Service account already exists: $SA_EMAIL"
fi

echo "Granting roles to deploy service account (idempotent-ish)..."
# NOTE: These roles may be tightened later.
# Hosting deploy
for ROLE in roles/firebase.admin roles/iam.serviceAccountUser roles/cloudbuild.builds.editor; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member "serviceAccount:$SA_EMAIL" \
    --role "$ROLE" \
    --quiet >/dev/null
  echo "Ensured role: $ROLE"
done

echo "Setting up Workload Identity Federation for GitHub Actions (no long-lived keys)"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

POOL_ID="mora-gha"
PROVIDER_ID="mora-gha"
LOCATION="global"

# Restrict which GitHub workflow can impersonate the deploy service account.
# This prevents other workflows (even in the same repo) from minting tokens.
EXPECTED_WORKFLOW_REF="$REPO/.github/workflows/deploy.yml@refs/heads/main"

if ! gcloud iam workload-identity-pools describe "$POOL_ID" \
  --project "$PROJECT_ID" \
  --location "$LOCATION" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --project "$PROJECT_ID" \
    --location "$LOCATION" \
    --display-name "mora GitHub Actions"
else
  echo "Workload Identity Pool already exists: $POOL_ID"
fi

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project "$PROJECT_ID" \
  --location "$LOCATION" \
  --workload-identity-pool "$POOL_ID" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project "$PROJECT_ID" \
    --location "$LOCATION" \
    --workload-identity-pool "$POOL_ID" \
    --display-name "GitHub OIDC" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref,attribute.actor=assertion.actor,attribute.job_workflow_ref=assertion.job_workflow_ref" \
    --attribute-condition "assertion.repository=='$REPO' && assertion.job_workflow_ref=='$EXPECTED_WORKFLOW_REF'"
else
  echo "Workload Identity Provider already exists: $PROVIDER_ID"
fi

echo "Allowing GitHub OIDC identities to impersonate: $SA_EMAIL"
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project "$PROJECT_ID" \
  --role "roles/iam.workloadIdentityUser" \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/$LOCATION/workloadIdentityPools/$POOL_ID/attribute.repository/$REPO" \
  --quiet >/dev/null

echo ""
echo "WIF configured. Use these values in GitHub Actions (Environment vars):"
echo "- GCP_WORKLOAD_IDENTITY_PROVIDER=projects/$PROJECT_NUMBER/locations/$LOCATION/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
echo "- GCP_SERVICE_ACCOUNT_EMAIL=$SA_EMAIL"
