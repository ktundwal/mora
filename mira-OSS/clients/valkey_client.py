"""
Unified Valkey client for system-wide use.

Combines auth operations (async) and working memory operations (sync) with
graceful degradation patterns. Uses Vault for configuration and includes
integrated TTL persistence monitoring.

MORA MODIFICATION (2026-01-10):
- Enhanced URL parsing to support redis:// URLs with auth and TLS (for Upstash)
- Format: redis://default:PASSWORD@host:port or rediss://... for TLS
- This change must be reapplied after MIRA-OSS updates
"""

import asyncio
import json
import logging
import time
import threading
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Global connection pool (singleton like PostgresClient)
_valkey_pool = None

@dataclass
class TTLPersistenceHandler:
    key_prefix: str
    handler_func: Callable[[str, str], None]  # Sync handler
    description: str


class ValkeyClient:
    """
    Production Valkey client with fail-fast semantics for required infrastructure.

    System fails to start if Valkey is unreachable. Operations fail loudly if
    Valkey goes down during runtime. Features connection pooling, TTL persistence
    monitoring, and retry patterns for transient failures.
    """
    
    def __init__(self):
        # TTL persistence components
        self.pubsub = None
        self.handlers: Dict[str, TTLPersistenceHandler] = {}

        # TTL monitoring thread components
        self._ttl_thread: Optional[threading.Thread] = None
        self._ttl_loop: Optional[asyncio.AbstractEventLoop] = None
        self._stop_event = threading.Event()

        # Get configuration and initialize connections
        # System fails to start if Valkey is unreachable (fail-fast)
        self._load_config()
        self._init_connections()
    
    def _load_config(self):
        """Loads config from Vault first, falls back to VALKEY_URL env var.

        MORA MODIFICATION: Enhanced to support redis:// URLs with auth and TLS (for Upstash).
        Supported formats:
        - valkey://host:port (original)
        - redis://host:port (no auth)
        - redis://user:password@host:port (with auth)
        - rediss://user:password@host:port (with auth + TLS)
        """
        try:
            from clients.vault_client import get_service_config
            self.valkey_url = get_service_config('services', 'valkey_url')
            logger.info(f"Valkey config loaded from Vault")
        except Exception as e:
            import os
            self.valkey_url = os.getenv('VALKEY_URL', 'valkey://localhost:6379')
            logger.warning(f"Vault unavailable, using fallback VALKEY_URL env var")

        # MORA MODIFICATION: Parse URL properly to extract auth and TLS settings
        self.host = 'localhost'
        self.port = 6379
        self.password = None
        self.ssl = False

        if self.valkey_url:
            parsed = urlparse(self.valkey_url)

            # Determine if TLS is needed (rediss:// scheme)
            self.ssl = parsed.scheme == 'rediss'

            # Extract host and port
            self.host = parsed.hostname or 'localhost'
            self.port = parsed.port or 6379

            # Extract password if present
            if parsed.password:
                self.password = parsed.password
                logger.info(f"Valkey connection: {self.host}:{self.port} (auth=yes, ssl={self.ssl})")
            else:
                logger.info(f"Valkey connection: {self.host}:{self.port} (auth=no, ssl={self.ssl})")
    
    def _init_connections(self):
        """
        Initialize Valkey connections with fail-fast semantics.

        Raises if Valkey is unreachable - system should not start without Valkey.

        MORA MODIFICATION: Added support for password auth and SSL/TLS (for Upstash).
        Uses from_url() which properly handles rediss:// URLs with SSL.
        """
        global _valkey_pool

        import valkey
        import valkey.asyncio as async_valkey

        # MORA MODIFICATION: Use from_url which handles auth and SSL properly
        # The URL format rediss://user:password@host:port enables TLS automatically
        logger.info(f"Connecting to Valkey: {self.host}:{self.port} (ssl={self.ssl})")

        # Create sync client from URL (handles auth + SSL automatically)
        self._client = valkey.from_url(
            self.valkey_url,
            decode_responses=True,
            health_check_interval=30,
            socket_keepalive=True,
            retry_on_timeout=True,
            socket_connect_timeout=10,
            socket_timeout=10
        )
        self._client.ping()  # Raises if unreachable - system fails to start

        # Create binary client from URL (for raw bytes like embeddings)
        self._binary_client = valkey.from_url(
            self.valkey_url,
            decode_responses=False,
            health_check_interval=30,
            socket_keepalive=True,
            retry_on_timeout=True,
            socket_connect_timeout=10,
            socket_timeout=10
        )

        # Create async client from URL
        self.valkey = async_valkey.from_url(
            self.valkey_url,
            encoding="utf-8",
            decode_responses=True,
            health_check_interval=30,
            socket_keepalive=True,
            retry_on_timeout=True,
            socket_connect_timeout=10,
            socket_timeout=10
        )

        logger.info(f"Valkey client initialized: {self.host}:{self.port} (ssl={self.ssl})")

    @property
    def valkey_available(self) -> bool:
        """
        Check if Valkey is available.

        Always returns True - if ValkeyClient initialized successfully, Valkey is available.
        ValkeyClient fails-fast at initialization if Valkey is unreachable.

        This property exists for test compatibility.
        """
        return True

    @property
    def valkey_binary(self):
        """
        Access the binary client for storing raw bytes (e.g., embeddings).

        The binary client has decode_responses=False, preserving bytes as-is
        without UTF-8 decoding. Used for numpy arrays and other binary data.
        """
        return self._binary_client

    def health_check(self) -> bool:
        """
        Sync health check.

        Returns True if Valkey responds to ping.
        Raises if Valkey is unreachable.
        """
        self._client.ping()
        return True

    async def health_check_async(self) -> bool:
        """
        Async health check.

        Returns True if Valkey responds to ping.
        Raises if Valkey is unreachable.
        """
        await self.valkey.ping()
        return True
    

    def get(self, key: str) -> Optional[str]:
        """
        Get value by key.

        Returns None if key doesn't exist.
        Raises if Valkey connection fails.
        """
        return self._client.get(key)

    def delete(self, key: str) -> bool:
        """
        Delete key.

        Returns True if key was deleted, False if key didn't exist.
        Raises if Valkey connection fails.
        """
        result = self._client.delete(key)
        return result > 0

    def exists(self, key: str) -> bool:
        """
        Check if key exists.

        Returns True if key exists, False if not.
        Raises if Valkey connection fails.
        """
        result = self._client.exists(key)
        return result > 0

    def ttl(self, key: str) -> int:
        """
        Get TTL of a key in seconds.

        Returns -1 if key has no TTL, -2 if key doesn't exist.
        Raises if Valkey connection fails.
        """
        return self._client.ttl(key)

    def scan(self, cursor: int, match: str = None, count: int = 100):
        """
        Scan keys matching pattern.

        Returns (next_cursor, keys) tuple.
        Raises if Valkey connection fails.
        """
        return self._client.scan(cursor, match=match, count=count)
    
    async def list_keys(self, pattern: str) -> List[str]:
        """List keys matching pattern (async)."""
        keys = []
        async for key in self.valkey.scan_iter(match=pattern):
            keys.append(key)
        return keys
    
    def increment_with_expiry(self, key: str, expiry_seconds: int) -> int:
        """Atomic increment with expiration - ideal for rate limiting."""
        # First increment the counter
        count = self._client.incr(key)

        # Only set expiry if this is the first increment (count == 1)
        # This prevents resetting the TTL window on every request
        if count == 1:
            self._client.expire(key, expiry_seconds)

        return count

    def json_set(self, key: str, path: str, value: Any, ex: int = None) -> bool:
        """Set JSON data, optionally with expiration.

        When path is "$", replaces entire value. When path is "$.field_name",
        updates just that field in existing JSON (read-modify-write).

        Args:
            key: The key to store JSON data
            path: "$" for full replacement, "$.field_name" for field update
            value: Value to set
            ex: Expiration in seconds. If None, preserves existing TTL (for updates)
                or uses no expiration (for new keys)

        Returns:
            True if successful, False if key doesn't exist (for field updates)
        """
        if path == "$":
            # Full replacement
            json_data = json.dumps(value)
            if ex is not None:
                return self._client.setex(key, ex, json_data)
            else:
                return self._client.set(key, json_data)

        # Field update: read-modify-write
        if not path.startswith("$."):
            raise ValueError(f"Unsupported path: {path}. Use '$' or '$.field_name'")

        current = self.json_get(key, "$")
        if current is None:
            return False

        data = current[0]
        field = path[2:]
        data[field] = value

        # Preserve existing TTL if no expiry specified
        if ex is None:
            remaining_ttl = self.ttl(key)
            ex = remaining_ttl if remaining_ttl > 0 else None

        json_data = json.dumps(data)
        if ex is not None:
            return self._client.setex(key, ex, json_data)
        else:
            return self._client.set(key, json_data)

    def json_set_with_expiry(self, key: str, path: str, value: Any, ex: int) -> bool:
        """Set JSON data with expiration. Alias for json_set with required ex."""
        return self.json_set(key, path, value, ex=ex)

    def json_get(self, key: str, path: str) -> Optional[List[Any]]:
        """Get JSON data (returns list format for JSONPath compatibility)."""
        json_str = self._client.get(key)
        if json_str is None:
            return None

        data = json.loads(json_str)
        return [data]  # Wrap in list to match expected JSONPath result format
    
    def hset_with_retry(self, hash_key: str, field: str, value: str) -> int:
        """Hash set with retry pattern for transient failures."""
        try:
            return self._client.hset(hash_key, field, value)
        except Exception as e:
            logger.debug(f"Valkey write failed, retrying: {e}")

        time.sleep(0.1)
        return self._client.hset(hash_key, field, value)  # Raises on failure

    def hget_with_retry(self, hash_key: str, field: str) -> Optional[str]:
        """Hash get with retry pattern for transient failures."""
        try:
            return self._client.hget(hash_key, field)
        except Exception as e:
            logger.debug(f"Valkey read failed, retrying: {e}")

        time.sleep(0.1)
        return self._client.hget(hash_key, field)

    def hgetall_with_retry(self, hash_key: str) -> Dict[str, str]:
        """Hash get all with retry pattern for transient failures."""
        try:
            return self._client.hgetall(hash_key)
        except Exception as e:
            logger.debug(f"Valkey read failed, retrying: {e}")

        time.sleep(0.1)
        return self._client.hgetall(hash_key)

    def hdel_with_retry(self, hash_key: str, *fields) -> int:
        """Hash delete with retry pattern for transient failures."""
        try:
            return self._client.hdel(hash_key, *fields)
        except Exception as e:
            logger.debug(f"Valkey delete failed, retrying: {e}")

        time.sleep(0.1)
        return self._client.hdel(hash_key, *fields)
    
    def set(self, key: str, value: str, nx: bool = None, ex: int = None) -> bool:
        """
        Set key to value.

        Args:
            key: Key to set
            value: Value to store
            nx: If True, only set if key doesn't exist
            ex: Expiration time in seconds

        Returns:
            True if key was set, False if NX was specified and key already exists

        Raises if Valkey connection fails.
        """
        kwargs = {}
        if nx is not None:
            kwargs['nx'] = nx
        if ex is not None:
            kwargs['ex'] = ex
        return self._client.set(key, value, **kwargs)

    def hlen(self, hash_key: str) -> int:
        """Get hash length."""
        return self._client.hlen(hash_key)

    def scan_iter(self, match: str = None):
        """Scan iterator for keys matching pattern."""
        return self._client.scan_iter(match=match)

    def expire(self, key: str, seconds: int) -> bool:
        """Set expiration on key."""
        return self._client.expire(key, seconds)

    def setex(self, key: str, seconds: int, value: str) -> bool:
        """Set key with expiration."""
        return self._client.setex(key, seconds, value)

    def flush_except_whitelist(self, preserve_prefixes: list[str]) -> int:
        """
        Delete all keys from Valkey except those matching whitelist prefixes.

        Used during system startup to clear all caches while preserving
        critical data like auth sessions and rate limiting.

        Args:
            preserve_prefixes: List of key prefixes to preserve (e.g., ["session:", "rate_limit:"])

        Returns:
            Number of keys deleted
        """
        deleted_count = 0
        preserved_count = 0

        # Scan all keys
        for key in self.scan_iter(match="*"):
            # Check if key starts with any whitelisted prefix
            should_preserve = any(key.startswith(prefix) for prefix in preserve_prefixes)

            if should_preserve:
                preserved_count += 1
            else:
                if self._client.delete(key):
                    deleted_count += 1

        logger.info(
            f"Flushed {deleted_count} keys from Valkey, "
            f"preserved {preserved_count} keys matching whitelist: {preserve_prefixes}"
        )
        return deleted_count

    def register_ttl_handler(self, key_prefix: str, handler_func: Callable[[str, str], None], description: str):
        """Register synchronous TTL handler."""
        self.handlers[key_prefix] = TTLPersistenceHandler(
            key_prefix=key_prefix,
            handler_func=handler_func,
            description=description
        )
        logger.info(f"TTL handler registered: '{key_prefix}' -> {description}")

        # Start monitoring if not already running
        if not (self._ttl_thread and self._ttl_thread.is_alive()):
            self._start_ttl_thread()
    
    def _start_ttl_thread(self):
        """Start background thread for TTL monitoring."""
        if self._ttl_thread and self._ttl_thread.is_alive():
            return  # Already running
            
        self._ttl_thread = threading.Thread(
            target=self._run_ttl_loop, 
            daemon=True,
            name="valkey-ttl-monitor"
        )
        self._ttl_thread.start()
        logger.info("TTL monitoring thread started")
    
    def _run_ttl_loop(self):
        """Run async event loop in background thread."""
        self._ttl_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self._ttl_loop)
        
        try:
            self._ttl_loop.run_until_complete(self._async_ttl_monitor())
        except Exception as e:
            logger.error(f"TTL monitoring thread error: {e}")
        finally:
            self._ttl_loop.close()
            logger.info("TTL monitoring thread stopped")
    
    async def _async_ttl_monitor(self):
        """Async TTL monitoring - runs in background thread only."""
        if not self.handlers:
            logger.info("TTL monitoring skipped - no handlers registered")
            return

        try:
            await self.valkey.config_set('notify-keyspace-events', 'Ex')
            
            self.pubsub = self.valkey.pubsub()
            await self.pubsub.psubscribe('__keyevent@0__:expired')
            
            registered_prefixes = list(self.handlers.keys())
            logger.info(f"Started TTL monitoring for prefixes: {registered_prefixes}")
            
            while not self._stop_event.is_set():
                try:
                    message = await asyncio.wait_for(
                        self.pubsub.get_message(timeout=1.0),
                        timeout=1.0
                    )
                    if message and message['type'] == 'pmessage':
                        await self._handle_warning_expiration(message['data'])
                except asyncio.TimeoutError:
                    continue  # Check stop_event
                except Exception as e:
                    logger.error(f"Error processing TTL message: {e}")
                    
        except Exception as e:
            logger.error(f"Error in TTL monitoring: {e}")
        finally:
            if self.pubsub:
                await self.pubsub.close()
    
    async def _handle_warning_expiration(self, expired_key: str):
        """Handle expiration - calls SYNC handlers."""
        if not expired_key.endswith(':warning'):
            return
        
        main_key = expired_key.replace(':warning', '')
        
        for prefix, handler in self.handlers.items():
            if main_key.startswith(f"{prefix}:"):
                identifier = main_key[len(f"{prefix}:"):]
                
                logger.debug(f"Warning expired for {main_key}, calling {handler.description}")
                
                try:
                    # Call SYNC handler directly - no await needed
                    handler.handler_func(main_key, identifier)
                except Exception as e:
                    logger.error(f"TTL handler failed for {main_key}: {e}")
                
                return
        
        logger.debug(f"No TTL handler for warning key: {expired_key}")
    
    def shutdown(self):
        """Clean shutdown of TTL monitoring."""
        if self._ttl_thread and self._ttl_thread.is_alive():
            logger.info("Shutting down TTL monitoring...")
            self._stop_event.set()
            
            # Stop the event loop
            if self._ttl_loop:
                self._ttl_loop.call_soon_threadsafe(self._ttl_loop.stop)
            
            # Wait for thread to finish
            self._ttl_thread.join(timeout=5.0)
            
            if self._ttl_thread.is_alive():
                logger.warning("TTL monitoring thread did not stop cleanly")
            else:
                logger.info("TTL monitoring stopped cleanly")
    
    def set_ttl_with_warning(self, main_key: str, ttl_seconds: int, warning_offset: int = 10):
        """Set TTL on main key plus warning key that expires earlier to trigger persistence."""
        self.expire(main_key, ttl_seconds)

        warning_key = f"{main_key}:warning"
        warning_ttl = max(1, ttl_seconds - warning_offset)
        self.setex(warning_key, warning_ttl, "1")

def create_ttl_persistence_setup(
    key_prefix: str,
    description: str,
    persistence_handler: Callable[[str, str], None],  # Sync handler
    default_ttl: int = 60
):
    global_client = get_valkey_client()
    global_client.register_ttl_handler(
        key_prefix=key_prefix,
        handler_func=persistence_handler, 
        description=description
    )
    
    def set_ttl_with_warning(key: str, ttl_seconds: int = default_ttl):
        global_client.set_ttl_with_warning(key, ttl_seconds)
    
    return set_ttl_with_warning

_valkey_client: Optional[ValkeyClient] = None


def get_valkey_client() -> ValkeyClient:
    global _valkey_client
    if _valkey_client is None:
        _valkey_client = ValkeyClient()
    return _valkey_client


def get_valkey() -> ValkeyClient:
    """Get Valkey client instance."""
    return get_valkey_client()