# Maintainer Brief Backend

Production-grade backend for Maintainer Brief - AI-powered GitHub repository analysis.

## Features

- 🔐 Secure authentication via Supabase Auth
- 🔗 Read-only GitHub integration
- 🤖 AI-powered analysis (4 output types)
- 📊 Job queue with progress tracking
- 📅 Automated scheduling (weekly/biweekly)
- 📧 Email & Slack notifications
- 📤 Export to Markdown/PDF
- 🛡️ Rate limiting & encryption
- ♻️ Idempotency & retries

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (JWT)
- **Queue**: BullMQ + Redis
- **AI**: OpenAI API
- **GitHub**: Octokit (REST API)

## Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Redis
- OpenAI API key
- GitHub OAuth App

## Setup

### 1. Clone and Install

```bash
cd maintainer-brief-backend
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required values:**
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL` (Supabase Postgres connection string)
- `REDIS_URL`
- `OPENAI_API_KEY`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `ENCRYPTION_KEY` (generate with: `openssl rand -hex 32`)

### 3. Database Setup

Run migrations to create all tables:

```bash
npm run build
npm run migrate
```

This creates:
- `users` (Supabase auth integration)
- `github_accounts` (OAuth tokens, encrypted)
- `repos` (connected repositories)
- `repo_settings` (per-repo configuration)
- `analysis_jobs` (job queue & status)
- `analysis_outputs` (AI-generated content)
- `export_requests` (export jobs)

### 4. Start Services

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm run build
npm start
```

**Worker process** (for job processing):
```bash
npm run worker
```

**Scheduler** (for automated runs):
```bash
npm run scheduler
```

### 5. Verify Setup

Health check:
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-16T...",
  "redis": "connected",
  "database": "connected"
}
```

## API Documentation

All endpoints (except `/health`) require authentication via Supabase JWT in the `Authorization` header:

```
Authorization: Bearer <supabase-jwt-token>
```

### Health

**GET** `/health`
- No auth required
- Returns system status

### GitHub Connection

**POST** `/github/connect`
```json
{
  "code": "github-oauth-code"
}
```
- Exchanges OAuth code for access token
- Stores encrypted token
- Returns github_account record

**GET** `/github/repos`
- Lists all repos user has access to on GitHub
- Use to populate repo selection UI

### Repository Management

**POST** `/repos`
```json
{
  "full_name": "owner/repo",
  "github_repo_id": "123456",
  "default_branch": "main",
  "is_private": false
}
```
- Connects a repo for analysis
- Creates default settings

**GET** `/repos`
- Lists user's connected repos
- Includes last_analyzed timestamp & status

**GET** `/repos/:repoId`
- Detailed repo info + settings + last job

**PATCH** `/repos/:repoId/settings`
```json
{
  "branch": "main",
  "analysis_depth": "deep",
  "output_tone": "detailed",
  "ignore_paths": ["node_modules/**", "dist/**"],
  "schedule": "weekly",
  "notify_email": true,
  "notify_slack": false
}
```

### Analysis Jobs

**POST** `/repos/:repoId/analyze`
- Triggers manual analysis
- Returns job ID
- Idempotent (checks for recent runs)

**GET** `/jobs/:jobId`
```json
{
  "id": "uuid",
  "status": "running",
  "progress": 60,
  "started_at": "...",
  "error_message": null
}
```

**GET** `/repos/:repoId/jobs`
- Lists recent jobs for a repo

### Outputs

**GET** `/repos/:repoId/outputs/latest`
- Returns latest outputs for all 4 types:
  - `maintainer_brief`
  - `contributor_quickstart`
  - `release_summary`
  - `good_first_issues`

**GET** `/outputs/:outputId`
```json
{
  "id": "uuid",
  "type": "maintainer_brief",
  "content_markdown": "# Maintainer Brief\n...",
  "confidence": 0.92,
  "sources_json": {
    "commits": ["sha1", "sha2"],
    "prs": [123, 456],
    "issues": [789]
  },
  "created_at": "..."
}
```

### Exports

**POST** `/outputs/:outputId/export`
```json
{
  "format": "markdown"
}
```
- Supported formats: `markdown`, `pdf`, `github_release`
- Returns export_request ID

**GET** `/exports/:exportId`
```json
{
  "id": "uuid",
  "status": "succeeded",
  "file_url": "https://storage.../file.md"
}
```

## Example Requests

### 1. Connect GitHub Account

```bash
# After OAuth flow, exchange code for token
curl -X POST http://localhost:3000/github/connect \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "github_oauth_code_here"}'
```

### 2. List Available Repos

```bash
curl http://localhost:3000/github/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

### 3. Connect a Repo

```bash
curl -X POST http://localhost:3000/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "facebook/react",
    "github_repo_id": "10270250",
    "default_branch": "main",
    "is_private": false
  }'
```

### 4. Trigger Analysis

```bash
curl -X POST http://localhost:3000/repos/$REPO_ID/analyze \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

### 5. Check Job Status

```bash
curl http://localhost:3000/jobs/$JOB_ID \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

### 6. Get Latest Outputs

```bash
curl http://localhost:3000/repos/$REPO_ID/outputs/latest \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

### 7. Export Output

```bash
curl -X POST http://localhost:3000/outputs/$OUTPUT_ID/export \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format": "markdown"}'
```

## Architecture

```
src/
├── config/          # Environment validation & config
├── db/              # Database client & migrations
├── auth/            # Supabase JWT middleware
├── github/          # Octokit client & data fetchers
├── ai/              # OpenAI client & prompt builders
├── analysis/        # Pipeline orchestration
├── queue/           # BullMQ setup & worker
├── notifications/   # Email & Slack
├── scheduler/       # Cron jobs for automation
├── routes/          # Fastify route handlers
├── utils/           # Encryption, retry, rate-limit
└── server.ts        # Main entry point
```

## Security Features

- ✅ All GitHub tokens encrypted at rest (AES-256-GCM)
- ✅ Supabase JWT verification on all protected routes
- ✅ Row-level ownership checks (users can only access their data)
- ✅ Input validation with Zod schemas
- ✅ Rate limiting (configurable per endpoint)
- ✅ No GitHub write operations (read-only)
- ✅ Secrets in environment variables only

## Job Processing

Analysis jobs go through these stages:

1. **Queued** (0%) - Job created, waiting for worker
2. **Fetching** (25%) - Collecting GitHub data
3. **Generating** (60%) - Running AI prompts
4. **Saving** (85%) - Storing outputs
5. **Done** (100%) - Job complete, notifications sent

## Idempotency

To prevent duplicate work:
- Jobs generate a `github_snapshot_hash` from: repo ID + branch + latest commit SHA + depth setting
- If a job with the same hash succeeded within the last 24 hours, return that job instead
- Clients can safely retry `POST /repos/:repoId/analyze`

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm test:watch
```

Tests cover:
- Auth middleware (JWT verification)
- Repo ownership checks
- Idempotency hashing
- Prompt output structure
- Rate limiting

## Deployment

### Railway (Recommended)

1. Create new project on Railway
2. Add PostgreSQL + Redis services
3. Connect GitHub repo
4. Set environment variables
5. Add start command: `npm run build && npm start`
6. Deploy worker separately with: `npm run build && npm run worker`
7. Deploy scheduler separately with: `npm run build && npm run scheduler`

### Docker

```bash
docker build -t maintainer-brief-backend .
docker run -p 3000:3000 --env-file .env maintainer-brief-backend
```

## Monitoring

Key metrics to monitor:
- Job success/failure rate
- Average job duration
- Queue depth
- API response times
- GitHub API rate limit remaining
- OpenAI token usage

## Rate Limits

- GitHub API: 5,000 requests/hour (authenticated)
- OpenAI API: Depends on your tier
- Our API: 100 requests/minute per user (configurable)

## Support

For issues or questions, contact: support@maintainerbrief.com

## License

MIT

