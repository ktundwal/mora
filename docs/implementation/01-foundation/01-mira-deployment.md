# 01-01: Deploy MIRA-OSS Service

**Status:** todo
**Priority:** p0 (critical)
**Estimate:** 2d
**Owner:** Unassigned
**Dependencies:** None

## Context

MIRA-OSS is the memory engine that powers Mora's pattern recognition and persistent context. We need to deploy it as a sidecar service that Firebase Cloud Functions can call.

**Related:**
- [Decision: MIRA-OSS Integration](../../docs/decisions/001-mira-oss-integration.md)
- [ARCHITECTURE.md](../../docs/design/ARCHITECTURE.md)

## Acceptance Criteria

- [ ] MIRA-OSS running on Cloud Run (or Fly.io)
- [ ] PostgreSQL database provisioned (Cloud SQL or Neon)
- [ ] Valkey/Redis cache provisioned (Upstash or Redis Cloud)
- [ ] Health endpoint responding: `GET /health`
- [ ] Chat endpoint accepting requests: `POST /chat`
- [ ] Service accessible via internal URL (not public)
- [ ] Secrets configured (Anthropic API key, MIRA service key)
- [ ] Monitoring/logging set up (Cloud Monitoring or equivalent)

## Technical Notes

### Deployment Options

**Option A: Cloud Run (Recommended)**
- Fully managed, auto-scales
- Dockerfile already exists in mira-OSS
- Command: `gcloud run deploy mora-mira --source=./mira-OSS`
- Min instances: 1 (avoid cold starts)
- Max instances: 10
- Memory: 2GB
- CPU: 2

**Option B: Fly.io**
- More control, cheaper
- Dockerfile already exists
- Command: `fly launch` in mira-OSS directory
- Scale: 1 instance initially
- Region: Same as Firebase Functions (reduce latency)

### Database Setup

**PostgreSQL:**
- Use managed service (Cloud SQL or Neon)
- Instance size: db-f1-micro initially (can scale up)
- Storage: 10GB SSD
- Backups: Daily automated
- Run migrations: `python mira-OSS/deploy/run_migrations.py`

**Valkey:**
- Use Upstash (serverless Redis) or Redis Cloud
- Free tier: 10MB (enough for caching)
- Persistence: Optional (cache can be rebuilt)

### Environment Variables

Create `.env` in mira-OSS or set via Cloud Run:

```bash
# Database
POSTGRES_HOST=<cloud-sql-host>
POSTGRES_PORT=5432
POSTGRES_DB=mira_service
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secret>

# Cache
VALKEY_HOST=<upstash-host>
VALKEY_PORT=6379
VALKEY_PASSWORD=<secret>

# Secrets
VAULT_ADDR=<vault-url-or-skip>
ANTHROPIC_API_KEY=<key>

# Mode
MIRA_SINGLE_USER_MODE=false
```

### Security

- **Service Authentication:** Generate service key, add to Firebase Function secrets
- **Network:** VPC connector for Cloud Run → Cloud SQL (private IP)
- **IAM:** Least privilege (Cloud Run service account can only access DB)

## Testing

### 1. Health Check
```bash
curl https://mora-mira-<hash>.run.app/health
# Expected: {"status": "healthy", "valkey": "connected", "postgres": "connected"}
```

### 2. Chat Endpoint (Create Test User)
```bash
# First, create a test user via MIRA's user creation endpoint
curl -X POST https://mora-mira-<hash>.run.app/users \
  -H "Authorization: Bearer <service-key>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@mora.app", "firebaseUid": "test-uid-123"}'

# Get user ID from response, then test chat
curl -X POST https://mora-mira-<hash>.run.app/chat \
  -H "Authorization: Bearer <service-key>" \
  -H "X-Mora-User-Id: <mira-user-id>" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, this is a test."}'

# Expected: JSON with AI response, surfaced_memories, entities
```

### 3. Load Test (Optional)
```bash
# Use Locust or Artillery to test 10 concurrent users
# Target: <2s response time for /chat
```

## Rollout Plan

1. Deploy to staging environment first
2. Validate with test users
3. Deploy to production
4. Monitor for 24h before using in main app

## Risks

- **Cold starts:** Mitigate with min instances = 1
- **Database connection limits:** PostgreSQL max connections = 100 (enough initially)
- **API key costs:** Monitor Anthropic usage, set budget alerts
- **Service downtime:** Set up uptime monitoring (Pingdom or UptimeRobot)

## Related Beads

- [01-02: Firebase-MIRA Bridge](./02-firebase-mira-bridge.md)
- [01-03: MIRA User Mapping](./03-mira-user-mapping.md)
