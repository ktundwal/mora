#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-dev}"

if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "prod" ]]; then
  echo "Usage: $0 [dev|prod]" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

"$SCRIPT_DIR/bootstrap-firebase.sh" "$ENVIRONMENT"
"$SCRIPT_DIR/bootstrap-github.sh" "$ENVIRONMENT"

echo ""
echo "Bootstrap complete for environment: $ENVIRONMENT"
echo "Next: run 'npm run build' and deploy via GitHub Actions or locally."
