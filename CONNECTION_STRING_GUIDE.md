# 🔗 Database Connection String Guide

## ❌ Current Issue: "Tenant or user not found"

This error means the connection pooler isn't recognizing the credentials. Here's how to fix it:

## ✅ Correct Format for Supabase Connection Pooler

Your **DATABASE_URL** should look like one of these:

### Option 1: Transaction Mode (Recommended)
```
postgresql://postgres.ygudmijcffyuarwoywmq:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

### Option 2: Session Mode
```
postgresql://postgres.ygudmijcffyuarwoywmq:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

### Option 3: Direct Connection (if pooler doesn't work)
```
postgresql://postgres:[PASSWORD]@db.ygudmijcffyuarwoywmq.supabase.co:5432/postgres
```

## 🔍 Important Details

### Username Format
For **connection pooler**, the username MUST include the project ref:
- ✅ `postgres.ygudmijcffyuarwoywmq`
- ❌ `postgres` (won't work with pooler)

For **direct connection**, use simple username:
- ✅ `postgres`

### Password
- Must be your **database password** (not Supabase account password)
- Find it in: Settings → Database → "Reset Database Password" if you forgot it
- Should be URL-encoded if it contains special characters (@, :, /, etc.)

### Common Issues

1. **Wrong password**: If you don't remember it, reset it in Supabase Dashboard
2. **Special characters in password**: Need to be URL-encoded
   - `@` → `%40`
   - `:` → `%3A`
   - `/` → `%2F`
   - `#` → `%23`

3. **Wrong username format**: Must match connection type (pooler vs direct)

## 🛠️ How to Get the Correct String

### Step 1: Go to Supabase Dashboard
https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/database

### Step 2: Find "Connection string"
You'll see two sections:
- **Connection string** (direct connection)
- **Connection pooling** (pooler connection)

### Step 3: Copy the RIGHT one

For **Connection pooling** → **Transaction mode**, you should see:
```
postgresql://postgres.ygudmijcffyuarwoywmq:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

### Step 4: Replace [YOUR-PASSWORD]
Replace `[YOUR-PASSWORD]` with your actual database password (the one you set when creating the project, or reset it if you don't remember).

### Step 5: Update your .env
```bash
DATABASE_URL=postgresql://postgres.ygudmijcffyuarwoywmq:your-actual-password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

⚠️ **Important**: 
- No spaces
- No quotes
- All on one line
- Replace `your-actual-password` with your real password

## 🧪 Test It

After updating:
```bash
node debug-env.js
npm run dev
curl http://localhost:3000/health
```

Should show: `"database":"connected"`

## 🆘 If Still Not Working

### Try Direct Connection Instead

If the pooler keeps failing, use direct connection:

```
DATABASE_URL=postgresql://postgres:your-password@db.ygudmijcffyuarwoywmq.supabase.co:5432/postgres
```

Note the differences:
- Username: `postgres` (NOT `postgres.ygudmijcffyuarwoywmq`)
- Host: `db.ygudmijcffyuarwoywmq.supabase.co`
- Port: `5432` (NOT `6543`)

### Reset Database Password

If you're not sure about your password:
1. Go to: https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/database
2. Click "Reset Database Password"
3. Copy the new password
4. Update DATABASE_URL immediately
5. Test again

---

**Most Common Fix**: Make sure your password is correct and matches what's in Supabase Dashboard!


