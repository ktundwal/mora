#!/bin/bash
# MIRA Cloud Run Entrypoint
# MORA MODIFICATION: Patches MIRA config to use Cloud Run's PORT env var

set -e

# Cloud Run sets PORT env var (usually 8080)
PORT=${PORT:-8080}

echo "Starting MIRA on port $PORT..."

# Start MIRA with Hypercorn, overriding the default port via command line
# Hypercorn supports --bind flag to override config
exec python -c "
import os
import sys
import asyncio
import signal
import logging

# Patch the port before importing config
os.environ['_MIRA_CLOUD_RUN_PORT'] = '$PORT'

from config.config_manager import config
from main import create_app, shutdown_handler

# Override the port from environment
config.api_server.port = int('$PORT')
config.api_server.host = '0.0.0.0'

# Setup logging
from utils.colored_logging import setup_colored_root_logging
setup_colored_root_logging(log_level=logging.WARNING, fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

logger = logging.getLogger(__name__)

# Start server
import hypercorn.asyncio
from hypercorn import Config

hypercorn_config = Config()
hypercorn_config.bind = [f'0.0.0.0:{config.api_server.port}']
hypercorn_config.alpn_protocols = ['h2', 'http/1.1']
hypercorn_config.log_level = 'warning'
hypercorn_config.workers = 1  # Cloud Run handles scaling via instances

# Cloud Run sets SIGTERM for graceful shutdown
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

for sig in (signal.SIGTERM, signal.SIGINT):
    loop.add_signal_handler(
        sig,
        lambda s=sig: asyncio.create_task(shutdown_handler(loop, signal=s))
    )

logger.info(f'Starting MIRA on 0.0.0.0:{config.api_server.port}')

try:
    loop.run_until_complete(hypercorn.asyncio.serve(create_app(), hypercorn_config))
except asyncio.CancelledError:
    logger.info('Server task cancelled')
finally:
    loop.close()
    logger.info('Event loop closed')
"
