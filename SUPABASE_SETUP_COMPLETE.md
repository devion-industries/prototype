# ✅ Supabase Database Setup Complete!

## What Was Done

Your Maintainer Brief database has been successfully set up on Supabase!

**Project Details:**
- **Project Name:** development.devion@gmail.com's Project
- **Project ID:** ygudmijcffyuarwoywmq
- **Region:** ap-south-1 (Mumbai)
- **Status:** ACTIVE_HEALTHY
- **Project URL:** https://ygudmijcffyuarwoywmq.supabase.co

**Database Tables Created (7 total):**
✅ `users` - User accounts (0 rows, RLS enabled)
✅ `github_accounts` - GitHub OAuth connections (0 rows, RLS enabled)
✅ `repos` - Connected repositories (0 rows, RLS enabled)
✅ `repo_settings` - Per-repo configuration (0 rows, RLS enabled)
✅ `analysis_jobs` - Job queue & status (0 rows, RLS enabled)
✅ `analysis_outputs` - AI-generated content (0 rows, RLS enabled)
✅ `export_requests` - Export jobs (0 rows, RLS enabled)

**Security Features:**
✅ Row-Level Security (RLS) enabled on all tables
✅ Policies enforce user can only see their own data
✅ Foreign key constraints maintain referential integrity
✅ Indexes created for optimal query performance

## Next Steps to Complete Setup

### 1. Get Your Service Role Key

The service role key is sensitive and wasn't included in the automated setup.

1. Go to: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/api
2. Copy the **service_role** key (starts with `eyJhbGc...`)
3. Save it securely - this key bypasses RLS!

### 2. Get Your Database Password

1. Go to: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/database
2. Click **Reset database password** or view your existing password
3. Copy the password

### 3. Create Your `.env` File

```bash
cd maintainer-brief-backend
cp .env.supabase .env
```

Then edit `.env` and fill in:

```bash
# From Supabase (already in .env.supabase):
SUPABASE_URL=https://ygudmijcffyuarwoywmq.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=<paste-service-role-key-here>

DATABASE_URL=postgresql://postgres:<paste-password-here>@db.ygudmijcffyuarwoywmq.supabase.co:5432/postgres

# Other required values:
REDIS_URL=redis://localhost:6379  # Or your Redis URL
OPENAI_API_KEY=sk-...             # Your OpenAI key
GITHUB_CLIENT_ID=...               # GitHub OAuth app ID
GITHUB_CLIENT_SECRET=...           # GitHub OAuth secret
ENCRYPTION_KEY=<generate-with-openssl-rand-hex-32>
FRONTEND_URL=http://localhost:5173
```

### 4. Set Up Supabase Storage for Exports

The export system needs a storage bucket:

1. Go to: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/storage/buckets
2. Click **New bucket**
3. Name: `exports`
4. **Public bucket:** ✅ Yes
5. Click **Create bucket**

### 5. Install Dependencies & Start

```bash
npm install
npm run build
npm run dev      # Terminal 1: API server
npm run worker   # Terminal 2: Job worker
```

### 6. Verify Setup

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","database":"connected","redis":"connected"}
```

## Access Your Database

**Via Supabase Dashboard:**
https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/editor

**Via psql:**
```bash
psql postgresql://postgres:[YOUR-PASSWORD]@db.ygudmijcffyuarwoywmq.supabase.co:5432/postgres
```

**Connection String (for other tools):**
```
Host: db.ygudmijcffyuarwoywmq.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [YOUR-PASSWORD]
```

## Database Schema

### Core Tables

**users** → **github_accounts** (OAuth tokens)
          ↓
       **repos** → **repo_settings** (config)
          ↓
    **analysis_jobs** → **analysis_outputs** (AI content)
          ↓
    **export_requests** (file exports)

### Example Query (via Supabase SQL Editor)

```sql
-- View all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

## Security Verification

Test RLS policies:

```sql
-- Create a test user
INSERT INTO auth.users (id, email) 
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com');

INSERT INTO users (id, email) 
VALUES ('00000000-0000-0000-0000-000000000001', 'test@example.com');

-- Verify user can only see their own data
SET request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
SELECT * FROM users;  -- Should see only test user
```

## Troubleshooting

### "relation does not exist" error
Run the migration again:
```bash
npm run migrate
```

### Can't connect to database
1. Check your password in `.env`
2. Verify IP allowlisting in Supabase dashboard (Settings → Database → Connection Pooling)
3. For local dev, ensure "Allow connections from anywhere" is enabled

### RLS blocking queries
If you're using the service role key, RLS is bypassed automatically.
For client queries, ensure you're passing a valid JWT token.

## What's Next?

1. ✅ Database is ready
2. ⬜ Fill in `.env` with all credentials
3. ⬜ Set up Redis (local or cloud)
4. ⬜ Get OpenAI API key
5. ⬜ Create GitHub OAuth app
6. ⬜ Run the backend and test

See `README.md` for full setup instructions!

## Support

- Supabase Dashboard: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq
- Database Issues: Check Supabase logs in dashboard
- Backend Issues: See `PRODUCTION_VALIDATION.md`

---

**Database setup completed on:** December 16, 2025  
**Migration applied:** ✅ initial_schema  
**Tables created:** 7  
**RLS policies:** 19  
**Ready for production:** Yes (after completing credentials)

