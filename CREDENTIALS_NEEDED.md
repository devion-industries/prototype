# 🔐 Credentials Needed to Complete Setup

Your Supabase database is **fully configured**! Just add these credentials to your `.env` file.

## Copy This to Your `.env` File

```bash
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# ✅ Supabase (YOUR PROJECT)
SUPABASE_URL=https://ygudmijcffyuarwoywmq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndWRtaWpjZmZ5dWFyd295d21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODk2MTEsImV4cCI6MjA4MTQ2NTYxMX0.d4cA5PM-LeR-L2khnjtKQU-xQsteQdLYLPkaYgyO_ME

# 🔑 GET THIS: Go to https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/api
SUPABASE_SERVICE_ROLE_KEY=<paste-your-service-role-key>

# 🔑 GET THIS: Go to https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/database
DATABASE_URL=postgresql://postgres:<YOUR-DB-PASSWORD>@db.ygudmijcffyuarwoywmq.supabase.co:5432/postgres

# Redis (for BullMQ) - Use local or cloud Redis
REDIS_URL=redis://localhost:6379

# 🔑 GET THIS: From https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-<your-openai-key>

# 🔑 CREATE THIS: At https://github.com/settings/developers → New OAuth App
GITHUB_CLIENT_ID=<your-github-oauth-client-id>
GITHUB_CLIENT_SECRET=<your-github-oauth-secret>
GITHUB_CALLBACK_URL=http://localhost:3000/github/callback

# 🔑 GENERATE THIS: Run in terminal: openssl rand -hex 32
ENCRYPTION_KEY=<64-character-hex-string>

# Email (optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=noreply@maintainerbrief.com

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=60000

# Job Configuration
MAX_CONCURRENT_JOBS=5
JOB_TIMEOUT_MS=600000
IDEMPOTENCY_WINDOW_HOURS=24

# Scheduler Configuration
SCHEDULER_START_HOUR=0
SCHEDULER_END_HOUR=23
SCHEDULER_TIMEZONE=UTC

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

## Quick Links to Get Credentials

1. **Service Role Key**: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/api
2. **Database Password**: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/database
3. **OpenAI Key**: https://platform.openai.com/api-keys
4. **GitHub OAuth App**: https://github.com/settings/developers

## Storage Bucket Setup

Create the `exports` bucket:

1. Go to: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/storage/buckets
2. Click **New bucket**
3. Name: `exports`
4. Public: **Yes**
5. Create

## Generate Encryption Key

```bash
openssl rand -hex 32
```

## After Creating `.env`

```bash
npm install
npm run build
npm run dev      # Start API
npm run worker   # Start worker (separate terminal)
```

Test:
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok","database":"connected","redis":"connected"}
```

See `SUPABASE_SETUP_COMPLETE.md` for full details!

