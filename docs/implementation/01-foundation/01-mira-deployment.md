# 01-01: Deploy MIRA-OSS Service

**Status:** todo
**Priority:** p0 (critical)
**Estimate:** 2d
**Owner:** Unassigned
**Dependencies:** None

## Context

MIRA-OSS is the memory engine that powers Mora's pattern recognition and persistent context. We deploy it as a separate service on Cloud Run that Firebase Cloud Functions call via IAM + Bearer token authentication.

**Architecture Decision:** Per [ADR-003](../../decisions/003-data-storage-strategy.md), we use:
- **PostgreSQL:** Supabase (free tier → $25/mo)
- **Deployment:** Cloud Run with IAM authentication
- **Cache:** Upstash (serverless Valkey/Redis)
- **Security:** Defense-in-depth (IAM + Bearer token)

**Related:**
- [ADR-001: MIRA-OSS Integration](../../decisions/001-mira-oss-integration.md)
- [ADR-003: Data Storage Strategy](../../decisions/003-data-storage-strategy.md)
- [ARCHITECTURE-VISION.md](../../design/ARCHITECTURE-VISION.md)

## Acceptance Criteria

- [ ] Supabase project created with PostgreSQL provisioned
- [ ] Upstash Valkey instance created
- [ ] MIRA-OSS running on Cloud Run
- [ ] Cloud Run IAM configured (Firebase Functions has invoker role)
- [ ] Bearer token generated and stored in Secret Manager
- [ ] Health endpoint responding: `GET /health`
- [ ] Chat endpoint accepting authenticated requests: `POST /chat`
- [ ] Service accessible ONLY via IAM (no public access)
- [ ] Monitoring/logging enabled (Cloud Monitoring)

## Technical Notes

### Step 1: Provision Supabase PostgreSQL

**Create Supabase Project:**
1. Go to [supabase.com](https://supabase.com)
2. Create new project: `mora-mira`
3. Note connection string: `postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
4. Enable connection pooling (Transaction mode recommended)

**Run MIRA Migrations:**
```bash
cd mira-OSS
export DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
python deploy/run_migrations.py
```

**Verify Tables Created:**
- `users`, `continuums`, `messages`, `memories`, `entities`, etc.

### Step 2: Provision Upstash Valkey

**Create Upstash Redis:**
1. Go to [upstash.com](https://upstash.com)
2. Create Redis database: `mora-mira-cache`
3. Note connection details:
   - Endpoint: `redis-xxxxx.upstash.io`
   - Port: `6379`
   - Password: `<token>`

**Test Connection:**
```bash
redis-cli -h redis-xxxxx.upstash.io -p 6379 -a <token> PING
# Expected: PONG
```

### Step 3: Generate API Secrets

**Generate Bearer Token:**
```bash
# Strong random API key
MIRA_SERVICE_KEY=$(openssl rand -base64 32)
echo "MIRA_SERVICE_KEY=$MIRA_SERVICE_KEY"
```

**Store in Google Secret Manager:**
```bash
# Create secret
echo -n "$MIRA_SERVICE_KEY" | gcloud secrets create mira-service-key \
  --data-file=- \
  --replication-policy=automatic

# Grant Cloud Run access
gcloud secrets add-iam-policy-binding mira-service-key \
  --member="serviceAccount:PROJECT-ID@appspot.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Step 4: Deploy to Cloud Run

**Deploy Command:**
```bash
cd mira-OSS

gcloud run deploy mora-mira \
  --source=. \
  --region=us-central1 \
  --platform=managed \
  --no-allow-unauthenticated \
  --min-instances=0 \
  --max-instances=2 \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300 \
  --set-env-vars="POSTGRES_HOST=aws-0-us-west-1.pooler.supabase.com,POSTGRES_PORT=6543,POSTGRES_DB=postgres,POSTGRES_USER=postgres.PROJECT-REF,VALKEY_HOST=redis-xxxxx.upstash.io,VALKEY_PORT=6379,MIRA_SINGLE_USER_MODE=false" \
  --set-secrets="POSTGRES_PASSWORD=supabase-db-password:latest,VALKEY_PASSWORD=upstash-redis-token:latest,ANTHROPIC_API_KEY=anthropic-api-key:latest,MIRA_API_KEY=mira-service-key:latest"
```

**Key Flags Explained:**
- `--no-allow-unauthenticated`: Requires IAM authentication (Layer 1 security)
- `--min-instances=0`: Save cost during development (accept cold starts)
- `--max-instances=2`: Limit scaling (you don't need more at 0 users)
- `--memory=2Gi`: Enough for spaCy models + embeddings
- `--timeout=300`: 5min timeout for long AI calls

### Step 5: Configure IAM Authentication

**Grant Firebase Functions Permission to Invoke:**
```bash
# Get your Firebase project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant invoker role
gcloud run services add-iam-policy-binding mora-mira \
  --region=us-central1 \
  --member="serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com" \
  --role="roles/run.invoker"
```

**Verify IAM Policy:**
```bash
gcloud run services get-iam-policy mora-mira --region=us-central1
# Should show Firebase Functions service account with roles/run.invoker
```

### Step 6: Store Bearer Token in Firebase

**Store in Firebase Functions Secrets:**
```bash
# Interactive prompt
firebase functions:secrets:set MIRA_SERVICE_KEY
# Paste the same value from Step 3
```

**Verify Secret:**
```bash
firebase functions:secrets:access MIRA_SERVICE_KEY
```

## Testing

### 1. Health Check (with IAM Token)
```bash
# Get Cloud Run URL
MIRA_URL=$(gcloud run services describe mora-mira --region=us-central1 --format='value(status.url)')

# Get IAM token (simulates Firebase Functions)
TOKEN=$(gcloud auth print-identity-token)

# Test health endpoint
curl -H "Authorization: Bearer $TOKEN" $MIRA_URL/health

# Expected: {"status": "healthy", "valkey": "connected", "postgres": "connected"}
```

### 2. Chat Endpoint (Full Auth Test)
```bash
# Use same IAM token + Bearer token
curl -X POST $MIRA_URL/chat \
  -H "Authorization: Bearer $MIRA_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, this is a test."}'

# Expected: JSON with AI response, surfaced_memories, entities
# If this fails with 401, check IAM permissions (Step 5)
```

### 3. Verify Security (Should Fail)
```bash
# Test WITHOUT IAM token (should fail)
curl $MIRA_URL/health
# Expected: 403 Forbidden (IAM blocked)

# Test WITH IAM but wrong Bearer token (should fail)
curl -H "Authorization: Bearer $TOKEN" \
  -H "X-API-Key: wrong-key" \
  $MIRA_URL/chat
# Expected: 401 Unauthorized (Bearer token validation failed)
```

## Rollout Plan

1. Deploy to staging environment first
2. Validate with test users
3. Deploy to production
4. Monitor for 24h before using in main app

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cold starts (min=0) | 10-30s latency on first request | Accept during development. Increase min-instances=1 in production |
| Supabase free tier limit (500MB) | Service degrades at ~5k entries | Monitor usage dashboard. Upgrade to Pro ($25/mo) before hitting limit |
| IAM misconfiguration | Firebase Functions can't reach MIRA | Test IAM policy in Step 5. Error messages are clear |
| Bearer token leak | Unauthorized API access | Both secrets stored in Secret Manager (encrypted). Rotate if compromised |
| Anthropic API costs | Budget overrun | Set budget alerts in Google Cloud. Monitor daily spend |
| MIRA service downtime | Users can't get AI analysis | Set up uptime monitoring (Cloud Monitoring alerts) |

## Cost Estimate

**Free Tier (0-20 users):**
- Supabase: $0 (free tier)
- Upstash: $0 (free tier)
- Cloud Run: $0 (within free quota: 2M requests, 360k vCPU-seconds)
- Secret Manager: $0 (6 secrets × $0.06/mo = free tier)
- **Total: $0/mo**

**Growth (100-500 users):**
- Supabase: $25/mo (Pro tier)
- Upstash: $10/mo (beyond free tier)
- Cloud Run: $20-50/mo (depends on traffic)
- Anthropic API: Variable ($0.30/unpack × volume)
- **Total: ~$55/mo + AI costs**

## Related Beads

- [01-02: Firebase-MIRA Bridge](./02-firebase-mira-bridge.md)
- [01-03: MIRA User Mapping](./03-mira-user-mapping.md)
