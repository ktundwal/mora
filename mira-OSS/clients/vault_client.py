"""
Production-ready Vault client for MIRA secret management.

Core principles:
- Never manages vault server lifecycle
- Fails fast with clear errors
- Uses environment variables for configuration
- Individual secret retrieval only
- IAM-ready auth abstraction

MORA MODIFICATION (2026-01-10):
- Added ENV_ONLY_MODE for Cloud Run deployment without HashiCorp Vault
- When VAULT_ADDR is not set, secrets are read from environment variables
- This change must be reapplied after MIRA-OSS updates
- See: docs/decisions/MIRA-ENV-ONLY-MODE.md
"""

import os
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Global singleton instance and cache
_vault_client_instance: Optional['VaultClient'] = None
_secret_cache: Dict[str, str] = {}

# =============================================================================
# MORA MODIFICATION: Environment-only mode for Cloud Run deployment
# =============================================================================
# When VAULT_ADDR is not set, MIRA reads secrets from environment variables
# instead of HashiCorp Vault. This enables simple Cloud Run deployment.
#
# Environment variable mapping:
#   MIRA_DATABASE_URL -> database URL (mira_service)
#   MIRA_ANTHROPIC_KEY -> Anthropic API key
#   MIRA_PROVIDER_KEY -> Provider key (OpenRouter, etc.)
#   MIRA_AUTH_JWT_SECRET -> JWT signing secret
#   MIRA_SERVICE_KEY -> Service API key for authentication
# =============================================================================

ENV_ONLY_MODE = not os.getenv('VAULT_ADDR')

# Environment variable mappings for ENV_ONLY_MODE
_ENV_SECRET_MAP = {
    # Database
    'mira/database/service_url': 'MIRA_DATABASE_URL',
    'mira/database/admin_url': 'MIRA_DATABASE_URL',  # Same URL, RLS handles isolation
    'mira/database/username': 'MIRA_DATABASE_USER',
    'mira/database/password': 'MIRA_DATABASE_PASSWORD',

    # API Keys - Anthropic
    'mira/api_keys/anthropic_key': 'MIRA_ANTHROPIC_KEY',
    'mira/api_keys/anthropic_batch_key': 'MIRA_ANTHROPIC_KEY',  # Use same key for batch API

    # API Keys - Generic providers (OpenRouter, etc.)
    'mira/api_keys/provider_key': 'MIRA_PROVIDER_KEY',
    'mira/api_keys/openrouter_key': 'MIRA_PROVIDER_KEY',  # Alias

    # API Keys - OpenAI (for embeddings)
    'mira/api_keys/openai_embeddings_key': 'MIRA_OPENAI_KEY',
    'mira/api_keys/openai_key': 'MIRA_OPENAI_KEY',  # Alias

    # Auth
    'mira/auth/jwt_secret': 'MIRA_AUTH_JWT_SECRET',
    'mira/auth/service_key': 'MIRA_SERVICE_KEY',

    # Services
    'mira/services/valkey_url': 'MIRA_VALKEY_URL',
}


def _get_env_secret(path: str, field: str) -> str:
    """Get secret from environment variable in ENV_ONLY_MODE."""
    cache_key = f"{path}/{field}"
    env_var = _ENV_SECRET_MAP.get(cache_key)

    if not env_var:
        raise KeyError(f"No environment variable mapping for secret '{cache_key}'. "
                      f"Add mapping to _ENV_SECRET_MAP in vault_client.py")

    value = os.getenv(env_var)
    if not value:
        raise ValueError(f"Environment variable '{env_var}' not set (required for '{cache_key}')")

    return value


def _ensure_vault_client() -> 'VaultClient':
    """Get or create Vault client singleton. In ENV_ONLY_MODE, returns None."""
    global _vault_client_instance

    if ENV_ONLY_MODE:
        logger.debug("ENV_ONLY_MODE: Vault client not needed")
        return None  # type: ignore

    if _vault_client_instance is None:
        _vault_client_instance = VaultClient()
    return _vault_client_instance


# Only import hvac if we're actually using Vault
if not ENV_ONLY_MODE:
    import hvac
    from hvac.exceptions import VaultError, InvalidPath, Unauthorized, Forbidden


class VaultClient:
    """Production client with AppRole auth, env-based config, fail-fast validation, and KV v2 API."""

    def __init__(self, vault_addr: Optional[str] = None,
                 vault_token: Optional[str] = None,
                 vault_namespace: Optional[str] = None):
        """Initializes with env vars, validates config, authenticates via AppRole, fails fast on errors."""
        if ENV_ONLY_MODE:
            raise RuntimeError("VaultClient should not be instantiated in ENV_ONLY_MODE")

        try:

            # Get configuration from environment
            self.vault_addr = vault_addr or os.getenv('VAULT_ADDR')
            self.vault_token = vault_token or os.getenv('VAULT_TOKEN')
            self.vault_namespace = vault_namespace or os.getenv('VAULT_NAMESPACE')

            # AppRole credentials
            self.vault_role_id = os.getenv('VAULT_ROLE_ID')
            self.vault_secret_id = os.getenv('VAULT_SECRET_ID')

            if not self.vault_addr:
                raise ValueError("VAULT_ADDR environment variable is required")

            if not self.vault_role_id or not self.vault_secret_id:
                raise ValueError("VAULT_ROLE_ID and VAULT_SECRET_ID environment variables are required")

            client_kwargs = {'url': self.vault_addr}

            if self.vault_namespace:
                client_kwargs['namespace'] = self.vault_namespace

            self.client = hvac.Client(**client_kwargs)
            self._authenticate_approle()

            if not self.client.is_authenticated():
                raise PermissionError("Vault authentication failed")

            logger.info(f"Vault client initialized: {self.vault_addr}")

        except Exception as e:
            logger.error(f"Vault client initialization failed: {e}")
            raise

    def _authenticate_approle(self):
        try:
            auth_response = self.client.auth.approle.login(
                role_id=self.vault_role_id,
                secret_id=self.vault_secret_id
            )

            self.client.token = auth_response['auth']['client_token']
            logger.info("AppRole authentication successful")

        except Exception as e:
            logger.error(f"AppRole authentication failed: {e}")
            raise PermissionError(f"AppRole authentication failed: {str(e)}")

    def get_secret(self, path: str, field: str) -> str:
        """Retrieves single field from KV v2 API with structured error handling."""
        try:

            response = self.client.secrets.kv.v2.read_secret_version(path=path, raise_on_deleted_version=True)
            secret_data = response['data']['data']

            if field not in secret_data:
                available_fields = list(secret_data.keys())
                raise KeyError(f"Field '{field}' not found in secret '{path}'. Available: {', '.join(available_fields)}")

            return secret_data[field]

        except InvalidPath:
            logger.error(f"Secret path not found: {path}")
            raise FileNotFoundError(f"Secret path '{path}' not found in Vault")

        except (Unauthorized, Forbidden) as e:
            logger.error(f"Access denied to secret {path}/{field}: {e}")
            raise PermissionError(f"Access denied to secret '{path}': {str(e)}")

        except VaultError as e:
            logger.error(f"Vault API error for {path}/{field}: {e}")
            raise RuntimeError(f"Vault API error retrieving '{path}/{field}': {str(e)}")

# Individual secret retrieval functions
def get_database_url(service: str, admin: bool = False) -> str:
    """
    Get database URL from Vault for mira_service.

    Args:
        service: Database service name (only 'mira_service' supported)
        admin: If True, returns admin connection string (mira_admin role with BYPASSRLS)

    Returns:
        PostgreSQL connection URL
    """
    if service != 'mira_service':
        raise ValueError(f"Unknown database service: '{service}'. Only 'mira_service' is supported.")

    field = 'admin_url' if admin else 'service_url'
    cache_key = f"mira/database/{field}"

    if cache_key in _secret_cache:
        return _secret_cache[cache_key]

    # MORA MODIFICATION: Use environment variable in ENV_ONLY_MODE
    if ENV_ONLY_MODE:
        value = _get_env_secret('mira/database', field)
        _secret_cache[cache_key] = value
        return value

    vault_client = _ensure_vault_client()
    value = vault_client.get_secret('mira/database', field)
    _secret_cache[cache_key] = value
    return value


def get_api_key(key_name: str) -> str:
    cache_key = f"mira/api_keys/{key_name}"

    if cache_key in _secret_cache:
        return _secret_cache[cache_key]

    # MORA MODIFICATION: Use environment variable in ENV_ONLY_MODE
    if ENV_ONLY_MODE:
        value = _get_env_secret('mira/api_keys', key_name)
        _secret_cache[cache_key] = value
        return value

    vault_client = _ensure_vault_client()
    value = vault_client.get_secret('mira/api_keys', key_name)
    _secret_cache[cache_key] = value
    return value


def get_auth_secret(secret_name: str) -> str:
    cache_key = f"mira/auth/{secret_name}"

    if cache_key in _secret_cache:
        return _secret_cache[cache_key]

    # MORA MODIFICATION: Use environment variable in ENV_ONLY_MODE
    if ENV_ONLY_MODE:
        value = _get_env_secret('mira/auth', secret_name)
        _secret_cache[cache_key] = value
        return value

    vault_client = _ensure_vault_client()
    value = vault_client.get_secret('mira/auth', secret_name)
    _secret_cache[cache_key] = value
    return value


def get_service_config(service: str, field: str) -> str:
    cache_key = f"mira/services/{field}"

    if cache_key in _secret_cache:
        return _secret_cache[cache_key]

    # MORA MODIFICATION: Use environment variable in ENV_ONLY_MODE
    if ENV_ONLY_MODE:
        value = _get_env_secret('mira/services', field)
        _secret_cache[cache_key] = value
        return value

    vault_client = _ensure_vault_client()
    value = vault_client.get_secret('mira/services', field)
    _secret_cache[cache_key] = value
    return value


def get_database_credentials() -> Dict[str, str]:
    username_key = "mira/database/username"
    password_key = "mira/database/password"

    # MORA MODIFICATION: Use environment variable in ENV_ONLY_MODE
    if ENV_ONLY_MODE:
        if username_key not in _secret_cache:
            _secret_cache[username_key] = _get_env_secret('mira/database', 'username')
        if password_key not in _secret_cache:
            _secret_cache[password_key] = _get_env_secret('mira/database', 'password')
        return {
            'username': _secret_cache[username_key],
            'password': _secret_cache[password_key]
        }

    vault_client = _ensure_vault_client()

    if username_key not in _secret_cache:
        _secret_cache[username_key] = vault_client.get_secret('mira/database', 'username')
    if password_key not in _secret_cache:
        _secret_cache[password_key] = vault_client.get_secret('mira/database', 'password')

    return {
        'username': _secret_cache[username_key],
        'password': _secret_cache[password_key]
    }



def preload_secrets() -> None:
    """
    Load all secrets into memory cache at startup.

    This prevents token expiration issues by caching everything
    while the AppRole token is still valid.

    In ENV_ONLY_MODE, this is a no-op (secrets loaded on demand from env vars).
    """
    # MORA MODIFICATION: Skip preload in ENV_ONLY_MODE
    if ENV_ONLY_MODE:
        logger.info("ENV_ONLY_MODE: Secrets will be loaded from environment variables on demand")
        return

    vault_client = _ensure_vault_client()

    # Load all API keys by reading the entire secret and caching each field
    try:
        response = vault_client.client.secrets.kv.v2.read_secret_version(
            path='mira/api_keys',
            raise_on_deleted_version=True
        )
        api_keys = response['data']['data']
        for key_name, value in api_keys.items():
            cache_key = f"mira/api_keys/{key_name}"
            _secret_cache[cache_key] = value
        logger.info(f"Preloaded {len(api_keys)} API keys into cache")
    except Exception as e:
        logger.error(f"Failed to preload API keys: {e}")

    # Load database credentials
    try:
        response = vault_client.client.secrets.kv.v2.read_secret_version(
            path='mira/database',
            raise_on_deleted_version=True
        )
        db_secrets = response['data']['data']
        for field, value in db_secrets.items():
            cache_key = f"mira/database/{field}"
            _secret_cache[cache_key] = value
        logger.info(f"Preloaded {len(db_secrets)} database secrets into cache")
    except Exception as e:
        logger.error(f"Failed to preload database secrets: {e}")

    # Load auth secrets
    try:
        response = vault_client.client.secrets.kv.v2.read_secret_version(
            path='mira/auth',
            raise_on_deleted_version=True
        )
        auth_secrets = response['data']['data']
        for field, value in auth_secrets.items():
            cache_key = f"mira/auth/{field}"
            _secret_cache[cache_key] = value
        logger.info(f"Preloaded {len(auth_secrets)} auth secrets into cache")
    except Exception as e:
        logger.error(f"Failed to preload auth secrets: {e}")


# Health check function
def test_vault_connection() -> Dict[str, Any]:
    # MORA MODIFICATION: Return success in ENV_ONLY_MODE
    if ENV_ONLY_MODE:
        return {
            "status": "success",
            "mode": "ENV_ONLY_MODE",
            "vault_addr": None,
            "namespace": None,
            "authenticated": True,
            "message": "Running in ENV_ONLY_MODE - secrets from environment variables"
        }

    try:
        vault_client = _ensure_vault_client()
        vault_client.get_secret('mira/database', 'username')

        return {
            "status": "success",
            "vault_addr": vault_client.vault_addr,
            "namespace": vault_client.vault_namespace,
            "authenticated": True,
            "message": "Vault connection successful"
        }

    except Exception as e:
        logger.error(f"Vault connection test failed: {e}")
        return {
            "status": "error",
            "message": str(e),
            "authenticated": False
        }
