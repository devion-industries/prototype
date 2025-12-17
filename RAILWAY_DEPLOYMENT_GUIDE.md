# 🚂 Railway Deployment Guide

## Quick Deploy (5 Minutes)

### Step 1: Push Latest Changes to GitHub

```bash
cd /Users/shauryasingh/testing/maintainer-brief-backend
git add .
git commit -m "Add Railway configuration"
git push origin main
```

### Step 2: Login to Railway

Go to: **https://railway.app**
- Click "Login with GitHub"
- Authorize Railway

### Step 3: Create New Project

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose: **`devion-industries/prototype`**
4. Railway will auto-detect it's a Node.js project

### Step 4: Configure Environment Variables

In Railway dashboard, go to **Variables** tab and add these:

```bash
# Supabase
SUPABASE_URL=https://ygudmijcffyuarwoywmq.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Database (use your connection pooler URL)
DATABASE_URL=postgresql://postgres.ygudmijcffyuarwoywmq:nandika2510@aws-1-ap-south-1.pooler.supabase.com:6543/postgres

# Redis (Railway will provide this - see Step 5)
REDIS_URL=redis://default:password@host:port

# OpenAI
OPENAI_API_KEY=<your-openai-key>

# GitHub OAuth
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>

# Encryption (64-char hex key)
ENCRYPTION_KEY=<your-64-char-encryption-key>

# Email (Optional)
SMTP_HOST=<your-smtp-host>
SMTP_PORT=587
SMTP_USER=<your-smtp-user>
SMTP_PASSWORD=<your-smtp-password>
FROM_EMAIL=<your-from-email>

# Server
PORT=3000
NODE_ENV=production
```

### Step 5: Add Redis Database

1. In your Railway project, click **"New"**
2. Select **"Database"** → **"Add Redis"**
3. Railway will auto-create `REDIS_URL` variable
4. Click the Redis service → **"Variables"** → copy `REDIS_URL`
5. This will automatically be available to your services

### Step 6: Create 3 Services

You need to deploy 3 separate services from the same repo:

#### Service 1: API Server
1. Click **"New"** → **"GitHub Repo"** → Select your repo
2. **Name:** `maintainer-brief-api`
3. **Variables → Start Command:**
   ```bash
   npm run build && npm start
   ```
4. **Settings → Networking:**
   - Generate Domain (Railway gives you a public URL)
   - Note this URL for your frontend

#### Service 2: Worker
1. Click **"New"** → **"GitHub Repo"** → Select same repo
2. **Name:** `maintainer-brief-worker`
3. **Variables → Start Command:**
   ```bash
   npm run build && npm run worker
   ```
4. Copy all environment variables from Service 1

#### Service 3: Scheduler
1. Click **"New"** → **"GitHub Repo"** → Select same repo
2. **Name:** `maintainer-brief-scheduler`
3. **Variables → Start Command:**
   ```bash
   npm run build && npm run scheduler
   ```
4. Copy all environment variables from Service 1

### Step 7: Deploy!

Railway will automatically:
- ✅ Install dependencies
- ✅ Build TypeScript
- ✅ Start all 3 services
- ✅ Give you public URLs

---

## Alternative: Railway CLI (Faster)

If you prefer command line:

### Install Railway CLI
```bash
npm install -g @railway/cli
```

### Login
```bash
railway login
```

### Initialize Project
```bash
cd /Users/shauryasingh/testing/maintainer-brief-backend
railway init
```

### Add Redis
```bash
railway add redis
```

### Set Variables
```bash
railway variables set SUPABASE_URL=https://ygudmijcffyuarwoywmq.supabase.co
railway variables set SUPABASE_ANON_KEY=<key>
railway variables set SUPABASE_SERVICE_ROLE_KEY=<key>
railway variables set DATABASE_URL=<url>
railway variables set OPENAI_API_KEY=<key>
railway variables set GITHUB_CLIENT_ID=<id>
railway variables set GITHUB_CLIENT_SECRET=<secret>
railway variables set ENCRYPTION_KEY=<key>
```

### Deploy API
```bash
railway up --service api
```

### Deploy Worker
```bash
railway up --service worker
```

### Deploy Scheduler
```bash
railway up --service scheduler
```

---

## Cost Estimate

**Railway Pricing:**
- Hobby Plan: **$5/month** (500 hours execution time)
- Developer Plan: **$10/month** (1000 hours)
- Team Plan: **$20/month** (unlimited)

**Your Usage:**
- API: ~$2/month (runs 24/7)
- Worker: ~$2/month (processes jobs)
- Scheduler: ~$1/month (cron only)
- Redis: ~$1/month (included)
- **Total: ~$6/month**

**Free Trial:**
- $5 free credit for new accounts
- No credit card required initially

---

## Verification Checklist

After deployment, verify everything works:

### 1. Check API Health
```bash
curl https://your-railway-domain.railway.app/health
# Should return: {"status":"ok","database":"connected","redis":"connected"}
```

### 2. Check Logs
In Railway dashboard:
- API logs: Should show "Server listening on port 3000"
- Worker logs: Should show "Worker started, waiting for jobs"
- Scheduler logs: Should show "Scheduler initialized"

### 3. Test Endpoint
```bash
curl https://your-railway-domain.railway.app/github/repos
# Should return: {"error":"Unauthorized"} (auth working!)
```

### 4. Monitor Resource Usage
Railway dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Request counts

---

## Update Your Frontend

Once deployed, update your frontend's API URL:

**Old:** `http://localhost:3000`  
**New:** `https://your-railway-domain.railway.app`

Add CORS origin in `src/server.ts`:
```typescript
fastify.register(cors, {
  origin: 'https://your-frontend-domain.com'
});
```

---

## Troubleshooting

### Issue: Build fails
**Solution:** Check Railway logs for errors. Usually npm install issue.

### Issue: Database won't connect
**Solution:** Make sure DATABASE_URL uses connection pooler format:
```
postgresql://postgres.ygudmijcffyuarwoywmq:password@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

### Issue: Redis connection fails
**Solution:** Railway Redis URL should auto-populate. Check Variables tab.

### Issue: Services crash on startup
**Solution:** Check all environment variables are set correctly.

---

## Production Optimizations

### 1. Enable Auto-Deploy
Settings → Deploy → Enable "Deploy on Push to main"

### 2. Add Custom Domain
Settings → Networking → Add Custom Domain

### 3. Set Up Monitoring
Add Sentry or LogRocket:
```bash
railway variables set SENTRY_DSN=<your-sentry-dsn>
```

### 4. Scale Workers
If queue gets backed up:
- Settings → Scale → Increase worker replicas

### 5. Add Health Checks
Settings → Health Checks → Add:
- **Path:** `/health`
- **Interval:** 30s
- **Timeout:** 5s

---

## Next Steps After Deployment

1. ✅ **Test API**: Use Postman/curl to verify endpoints
2. ✅ **Connect Frontend**: Update API URL in frontend
3. ✅ **Add Monitoring**: Sentry for errors
4. ✅ **Set Up Alerts**: Email on service crashes
5. ✅ **Scale**: Add more workers if needed

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Your Backend Logs: Railway Dashboard → Service → Logs

---

**Your Railway deployment URL will look like:**
```
https://maintainer-brief-api-production-xxxx.up.railway.app
```

Copy this URL for your frontend! 🚀

