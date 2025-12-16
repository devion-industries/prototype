# Quick Start Guide

Get Maintainer Brief backend running in 5 minutes.

## Prerequisites

- Node.js 18+
- Supabase account (free tier works)
- Redis (local or cloud)
- GitHub Personal Access Token
- OpenAI API key

## 1. Clone & Install (1 min)

```bash
cd maintainer-brief-backend
npm install
```

## 2. Configure Environment (2 min)

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

**Required:**
```env
# Supabase (from dashboard)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# Redis (local: redis://localhost:6379)
REDIS_URL=redis://localhost:6379

# OpenAI
OPENAI_API_KEY=sk-your-key-here

# GitHub OAuth (create app at github.com/settings/developers)
GITHUB_CLIENT_ID=your-client-id
GITHUB_CLIENT_SECRET=your-client-secret
GITHUB_CALLBACK_URL=http://localhost:3000/github/callback

# Security (generate: openssl rand -hex 32)
ENCRYPTION_KEY=your-64-char-hex-key-here

# Frontend
FRONTEND_URL=http://localhost:5173
```

## 3. Database Setup (1 min)

```bash
npm run build
npm run migrate
```

This creates all tables in your Supabase database.

## 4. Start Services (1 min)

**Terminal 1** - API Server:
```bash
npm run dev
```

**Terminal 2** - Worker:
```bash
npm run worker
```

**Terminal 3** (optional) - Scheduler:
```bash
npm run scheduler
```

## 5. Test It Works

```bash
curl http://localhost:3000/health
```

Expected:
```json
{
  "status": "ok",
  "timestamp": "2025-12-16T...",
  "database": "connected",
  "redis": "connected"
}
```

## 🎉 You're Ready!

### Next Steps:

1. **Get Supabase JWT**: Sign up a test user in Supabase Auth dashboard
2. **Connect GitHub**: `POST /github/connect` with your token
3. **Add a repo**: `POST /repos`
4. **Trigger analysis**: `POST /repos/:id/analyze`
5. **Watch it work**: `GET /jobs/:id`

See `API_EXAMPLES.md` for detailed curl commands.

## Common Issues

### "Redis connection failed"
- Install Redis: `brew install redis` (Mac) or `apt install redis` (Ubuntu)
- Start Redis: `redis-server`

### "Database connection failed"
- Check `DATABASE_URL` format
- Verify Supabase project is active
- Check firewall/network settings

### "OpenAI API error"
- Verify API key is valid
- Check account has credits
- Ensure key starts with `sk-`

### "GitHub rate limit"
- Use authenticated token (5000 req/hr vs 60)
- Implement caching (future enhancement)

## Development Tips

**Watch logs:**
```bash
# API logs
npm run dev

# Worker logs in real-time
npm run worker | bunyan  # if you have bunyan CLI
```

**Run tests:**
```bash
npm test
```

**Format code:**
```bash
npm run format
```

**Check types:**
```bash
npm run build
```

## Production Deployment

See `DEPLOYMENT.md` for Railway, Docker, and production setup.

## Need Help?

- Check `README.md` for detailed documentation
- See `API_EXAMPLES.md` for API usage
- Read `DEPLOYMENT.md` for production setup
- Review `CONTRIBUTING.md` for development guidelines

---

**Estimated time to first analysis: 5 minutes setup + 2-5 minutes per repo analysis**

