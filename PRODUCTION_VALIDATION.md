# Production Validation Checklist

Before deploying, verify these points.

## ✅ A. Clean Startup Test

Run each service and verify no errors:

```bash
# Terminal 1: API Server
npm run dev
# Expected: "Server running at http://0.0.0.0:3000"
# Should NOT see: TODO warnings, placeholder messages, or startup errors

# Terminal 2: Worker
npm run worker
# Expected: "Workers started" with concurrency info
# Should connect to Redis and wait for jobs

# Terminal 3: Scheduler
npm run scheduler
# Expected: "Scheduler started (runs hourly)"
# Should NOT crash

# Terminal 4: Migrations
npm run migrate
# Expected: "Migrations completed successfully!"
# Should create all 7 tables
```

**Pass criteria:** All 4 start without errors and stay running.

## ✅ B. API Endpoint Validation

Test with real Supabase JWT:

### 1. Health Check
```bash
curl http://localhost:3000/health
```
**Expected:** `{"status":"ok","database":"connected","redis":"connected"}`

### 2. GitHub Connect
```bash
curl -X POST http://localhost:3000/github/connect \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "ghp_your_real_token"}'
```
**Expected:** `{"id":"uuid","github_login":"username","created_at":"..."}`
**NOT:** Placeholder, TODO, or stubbed response

### 3. List GitHub Repos
```bash
curl http://localhost:3000/github/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```
**Expected:** Real list of repos from GitHub API
**NOT:** Empty array or fake data

### 4. Connect Repo
```bash
curl -X POST http://localhost:3000/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "octocat/Hello-World",
    "github_repo_id": "1296269",
    "default_branch": "master",
    "is_private": false
  }'
```
**Expected:** `{"id":"uuid","full_name":"...","status":"active"}`
**Verify:** Record exists in `repos` table

### 5. Trigger Analysis
```bash
export REPO_ID="your-repo-uuid"
curl -X POST http://localhost:3000/repos/$REPO_ID/analyze \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```
**Expected:** `{"job_id":"uuid","status":"queued"}`
**Verify:** Job appears in worker logs within seconds

### 6. Get Outputs
```bash
# Wait 2-5 minutes for job to complete, then:
curl http://localhost:3000/repos/$REPO_ID/outputs/latest \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```
**Expected:** 4 output types with real markdown content
**NOT:** "Not enough signals", empty strings, or TODO messages

## ✅ C. Queue System Validation

### Redis Connection
```bash
redis-cli ping
# Expected: PONG
```

### Job Processing
1. Trigger an analysis job
2. Watch worker logs
3. **Verify:**
   - Job is picked up within 5 seconds
   - Progress updates appear (0% → 25% → 60% → 85% → 100%)
   - Job completes successfully
   - Outputs saved to database

```bash
# Query job status
psql $DATABASE_URL -c "SELECT id, status, progress FROM analysis_jobs ORDER BY created_at DESC LIMIT 1;"
```

### BullMQ Dashboard (Optional)
```bash
npm install -g bull-board
bull-board
```
Open http://localhost:3000/admin/queues to see queue status.

## ✅ D. Encryption Validation

### Check Implementation
```bash
# View encryption code
cat src/utils/encryption.ts | grep -A 5 "ALGORITHM"
```

**Must have:**
- ✅ `aes-256-gcm` algorithm
- ✅ Random IV per encryption (16 bytes)
- ✅ Auth tag stored with ciphertext
- ✅ Key from environment variable (not hardcoded)

### Test Encryption
```bash
# In node REPL:
node
> const { encrypt, decrypt } = require('./dist/utils/encryption');
> const token = 'ghp_test123';
> const enc1 = encrypt(token);
> const enc2 = encrypt(token);
> console.log(enc1 === enc2); // Should be FALSE (different IVs)
> console.log(decrypt(enc1)); // Should be 'ghp_test123'
```

### Verify Database
```bash
psql $DATABASE_URL -c "SELECT access_token_encrypted FROM github_accounts LIMIT 1;"
```
**Expected:** Long base64 string (NOT readable plaintext)
**NOT:** `ghp_...` or readable token

## ✅ E. Row-Level Security (RLS) Validation

### Test User Isolation

1. **Create two test users in Supabase Auth:**
   - User A (get JWT token A)
   - User B (get JWT token B)

2. **User A connects a repo:**
```bash
curl -X POST http://localhost:3000/repos \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"test/repo-a","github_repo_id":"123","default_branch":"main","is_private":false}'
```

3. **User B tries to access User A's repo:**
```bash
curl http://localhost:3000/repos/$REPO_A_ID \
  -H "Authorization: Bearer $TOKEN_B"
```

**Expected:** `403 Forbidden` or `404 Not Found`
**NOT:** User A's repo data

### Direct Database Test
```bash
# Set user context and try to read other user's data
psql $DATABASE_URL <<EOF
SET request.jwt.claim.sub = 'user-b-uuid';
SELECT * FROM repos WHERE user_id = 'user-a-uuid';
EOF
```
**Expected:** 0 rows (RLS blocks access)

### Test All Tables
- ✅ `repos`: User B can't see User A's repos
- ✅ `analysis_jobs`: User B can't see User A's jobs
- ✅ `analysis_outputs`: User B can't see User A's outputs
- ✅ `github_accounts`: User B can't see User A's tokens

## ✅ F. File Storage Validation

### Supabase Storage Setup
1. Go to Supabase dashboard → Storage
2. Verify `exports` bucket exists
3. Check it's set to **public**

### Test Export
```bash
# Get an output ID
export OUTPUT_ID="your-output-uuid"

# Trigger export
curl -X POST http://localhost:3000/outputs/$OUTPUT_ID/export \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "markdown"}'

# Get export status
export EXPORT_ID="returned-export-uuid"
curl http://localhost:3000/exports/$EXPORT_ID \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

**Expected:**
```json
{
  "status": "succeeded",
  "file_url": "https://xxxxx.supabase.co/storage/v1/object/public/exports/repo-name-timestamp.md"
}
```

**Verify:** Open `file_url` in browser → should download markdown file

**NOT:** `/exports/filename.md` (local path), TODO, or placeholder

## ✅ G. Scheduler Validation

### Configurable Hours
```bash
# Check config
cat .env | grep SCHEDULER
# Should see:
# SCHEDULER_START_HOUR=0
# SCHEDULER_END_HOUR=23
# SCHEDULER_TIMEZONE=UTC
```

### Test Scheduled Run
1. Set a repo to `schedule: 'weekly'`
2. Manually trigger scheduler check:
```bash
# In scheduler logs, you should see:
# "Scheduling analysis for owner/repo"
# OR "Outside scheduled hours, skipping..."
```

3. Verify job was created:
```bash
psql $DATABASE_URL -c "SELECT trigger FROM analysis_jobs WHERE trigger = 'schedule';"
```

## ✅ H. No TODOs or Placeholders

```bash
# Search entire codebase
grep -r "TODO\|FIXME\|placeholder\|stub" src/

# Expected: No critical TODOs
# Acceptable: Comments like "// Future: add caching"
```

## ✅ I. Error Handling

### Test Invalid Inputs
```bash
# Invalid repo name
curl -X POST http://localhost:3000/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"invalid","github_repo_id":"123","default_branch":"main","is_private":false}'
# Expected: 400 Bad Request with validation error

# Invalid UUID
curl http://localhost:3000/repos/not-a-uuid \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
# Expected: 404 or 400

# Missing auth
curl http://localhost:3000/repos
# Expected: 401 Unauthorized
```

### Test Rate Limiting
```bash
# Send 101 requests rapidly (limit is 100/min)
for i in {1..101}; do
  curl -s http://localhost:3000/health > /dev/null
done
# Expected: Last request returns 429 Too Many Requests
```

## ✅ J. Integration Test

Complete end-to-end flow:

```bash
#!/bin/bash
set -e

echo "1. Connect GitHub account"
GITHUB_RESPONSE=$(curl -s -X POST http://localhost:3000/github/connect \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "ghp_your_token"}')
echo "✅ GitHub connected: $(echo $GITHUB_RESPONSE | jq -r '.github_login')"

echo "2. Connect repository"
REPO_RESPONSE=$(curl -s -X POST http://localhost:3000/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"octocat/Hello-World","github_repo_id":"1296269","default_branch":"master","is_private":false}')
REPO_ID=$(echo $REPO_RESPONSE | jq -r '.id')
echo "✅ Repo connected: $REPO_ID"

echo "3. Trigger analysis"
JOB_RESPONSE=$(curl -s -X POST http://localhost:3000/repos/$REPO_ID/analyze \
  -H "Authorization: Bearer $SUPABASE_TOKEN")
JOB_ID=$(echo $JOB_RESPONSE | jq -r '.job_id')
echo "✅ Job started: $JOB_ID"

echo "4. Wait for completion..."
while true; do
  STATUS=$(curl -s http://localhost:3000/jobs/$JOB_ID \
    -H "Authorization: Bearer $SUPABASE_TOKEN" | jq -r '.status')
  
  if [ "$STATUS" = "succeeded" ]; then
    echo "✅ Job completed successfully"
    break
  elif [ "$STATUS" = "failed" ]; then
    echo "❌ Job failed"
    exit 1
  fi
  
  sleep 10
done

echo "5. Fetch outputs"
OUTPUTS=$(curl -s http://localhost:3000/repos/$REPO_ID/outputs/latest \
  -H "Authorization: Bearer $SUPABASE_TOKEN")

if [ "$(echo $OUTPUTS | jq -r '.maintainer_brief.content_markdown')" != "null" ]; then
  echo "✅ All outputs generated"
else
  echo "❌ Outputs missing"
  exit 1
fi

echo "🎉 All tests passed!"
```

## Summary Checklist

- [ ] All services start cleanly
- [ ] No TODO/placeholder behavior in responses
- [ ] Redis connected and processing jobs
- [ ] AES-256-GCM encryption with random IVs
- [ ] RLS prevents cross-user data access
- [ ] File storage returns real URLs
- [ ] Scheduler hours are configurable
- [ ] Error handling works correctly
- [ ] Rate limiting enforced
- [ ] End-to-end test passes

## If Any Test Fails

**Not production-ready yet.** Fix the failing component before deploying.

## Optional Enhancements

These are NOT required for production, but nice to have:

- [ ] PDF export (requires puppeteer)
- [ ] Webhook notifications
- [ ] Analytics/monitoring (Sentry)
- [ ] Automated backups
- [ ] Load testing (100+ concurrent users)
- [ ] CI/CD pipeline
- [ ] Blue-green deployment


