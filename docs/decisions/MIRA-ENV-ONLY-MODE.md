# MIRA ENV_ONLY_MODE - Mora Modification

**Date:** 2026-01-10
**Status:** Active
**Applies to:** `mira-OSS/clients/vault_client.py`

## Summary

We modified MIRA's `vault_client.py` to support running without HashiCorp Vault by reading secrets from environment variables when `VAULT_ADDR` is not set.

## Why This Modification

MIRA-OSS requires HashiCorp Vault for secret management, which adds significant infrastructure complexity:
- Vault server deployment (~$50-100/mo or self-hosted complexity)
- AppRole authentication setup
- Secret path configuration

For Mora's Cloud Run deployment, we use Google Secret Manager instead, which injects secrets as environment variables. This modification bridges that gap.

## What Changed

**File:** `mira-OSS/clients/vault_client.py`

**Changes:**
1. Added `ENV_ONLY_MODE` flag that activates when `VAULT_ADDR` is not set
2. Added `_ENV_SECRET_MAP` dictionary mapping Vault paths to environment variable names
3. Modified all secret retrieval functions to check `ENV_ONLY_MODE` first
4. Conditional import of `hvac` library (only imported when Vault is used)

## Environment Variable Mapping

| Vault Path | Environment Variable |
|------------|---------------------|
| `mira/database/service_url` | `MIRA_DATABASE_URL` |
| `mira/database/admin_url` | `MIRA_DATABASE_URL` |
| `mira/database/username` | `MIRA_DATABASE_USER` |
| `mira/database/password` | `MIRA_DATABASE_PASSWORD` |
| `mira/api_keys/anthropic_key` | `MIRA_ANTHROPIC_KEY` |
| `mira/api_keys/provider_key` | `MIRA_PROVIDER_KEY` |
| `mira/api_keys/openai_embeddings_key` | `MIRA_OPENAI_KEY` |
| `mira/auth/jwt_secret` | `MIRA_AUTH_JWT_SECRET` |
| `mira/auth/service_key` | `MIRA_SERVICE_KEY` |
| `mira/services/valkey_url` | `MIRA_VALKEY_URL` |

## Reapplying After MIRA Updates

When you pull updates to `mira-OSS/`, this modification will be overwritten. To reapply:

1. Check git diff to see what was lost:
   ```bash
   git diff mira-OSS/clients/vault_client.py
   ```

2. The key changes are marked with `# MORA MODIFICATION` comments

3. Or restore from this commit:
   ```bash
   git checkout <commit-hash> -- mira-OSS/clients/vault_client.py
   ```

## Testing ENV_ONLY_MODE

```bash
# Verify ENV_ONLY_MODE is active (no VAULT_ADDR)
python -c "from clients.vault_client import ENV_ONLY_MODE; print(f'ENV_ONLY_MODE: {ENV_ONLY_MODE}')"

# Test secret retrieval
MIRA_DATABASE_URL="postgresql://test" python -c "from clients.vault_client import get_database_url; print(get_database_url('mira_service'))"
```

## Additional Modification: valkey_client.py

We also modified `mira-OSS/clients/valkey_client.py` to support Redis URLs with authentication and TLS (required for Upstash).

**File:** `mira-OSS/clients/valkey_client.py`

**Changes:**
1. Added `urllib.parse.urlparse` for proper URL parsing
2. Extract password from URL (e.g., `redis://default:PASSWORD@host:port`)
3. Detect TLS from `rediss://` scheme
4. Pass `password` and `ssl=True` to connection pool

**Upstash URL format:**
```
rediss://default:PASSWORD@host.upstash.io:6379
```

## Additional Modification: main.py

We modified `mira-OSS/main.py` to handle ENV_ONLY_MODE in the `ensure_single_user` function.

**File:** `mira-OSS/main.py`

**Changes:**
1. Added ENV_ONLY_MODE import from vault_client
2. In `ensure_single_user()`, read service key from environment when in ENV_ONLY_MODE
3. Skip Vault client initialization when in ENV_ONLY_MODE

## Additional Modification: llm_provider.py

We modified `mira-OSS/clients/llm_provider.py` to detect Anthropic API endpoints and use the native Anthropic client instead of the generic OpenAI client.

**File:** `mira-OSS/clients/llm_provider.py`

**Changes:**
1. In `_generate_non_streaming()`, detect if `endpoint_url` contains "api.anthropic.com"
2. If Anthropic endpoint detected, clear `endpoint_url` to route to native Anthropic client
3. This allows internal_llm table entries with Anthropic endpoints to work correctly

**Why needed:** The `internal_llm` table has a NOT NULL constraint on `endpoint_url`. When using Claude models, setting endpoint_url to Anthropic's URL caused the generic OpenAI client to be used (which fails). This fix detects Anthropic URLs and routes to the native client.

## Files Modified (Must Reapply After MIRA Updates)

1. `mira-OSS/clients/vault_client.py` - ENV_ONLY_MODE for secrets
2. `mira-OSS/clients/valkey_client.py` - Redis URL parsing with auth/TLS
3. `mira-OSS/clients/llm_provider.py` - Anthropic endpoint detection
4. `mira-OSS/main.py` - ENV_ONLY_MODE in ensure_single_user
5. `mira-OSS/Dockerfile` - Cloud Run container (Mora-specific, not in upstream)
6. `mira-OSS/docker-entrypoint.sh` - Port override for Cloud Run (Mora-specific)
7. `mira-OSS/deploy/env_only_mode_patch.sql` - Database patch for Anthropic models

## Future Considerations

- If MIRA upstream adds native environment variable support, remove this modification
- Consider contributing this feature back to MIRA-OSS
- Keep track of which MIRA version this was based on for compatibility
