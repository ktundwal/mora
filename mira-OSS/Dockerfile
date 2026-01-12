# MIRA-OSS Dockerfile for Cloud Run
# MORA MODIFICATION: This Dockerfile is Mora-specific, not part of MIRA-OSS upstream

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Install Python dependencies
# Note: Using --no-cache-dir to reduce image size
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model
RUN python -m spacy download en_core_web_lg

# Copy application code
COPY . .

# Copy Cloud Run entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create non-root user for security
RUN useradd -m -u 1000 mira && chown -R mira:mira /app
USER mira

# Cloud Run uses PORT environment variable (default 8080)
ENV PORT=8080
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/v0/api/health || exit 1

# Start MIRA via entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
