# 🔐 Fix Database Password

## ✅ Good News!
Your connection string format is now **CORRECT**! 

The error "password authentication failed" means we're successfully reaching the database, but the password is wrong.

## 🔧 Solution: Reset Your Database Password

### Step 1: Go to Supabase Dashboard
https://supabase.com/dashboard/project/ygudmijcffyuarwoywmq/settings/database

### Step 2: Find "Database Password" Section
Scroll down to the "Database Password" section.

### Step 3: Reset Password
1. Click **"Reset Database Password"**
2. A new strong password will be generated
3. **COPY IT IMMEDIATELY** (you won't see it again!)

### Step 4: Update Your .env File

Your DATABASE_URL should look like this:

```bash
DATABASE_URL=postgresql://postgres.ygudmijcffyuarwoywmq:PASTE-NEW-PASSWORD-HERE@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
```

**Important:**
- Replace `PASTE-NEW-PASSWORD-HERE` with the password you just copied
- Remove any spaces
- Keep it all on one line
- No quotes around the URL

### Step 5: Test It

```bash
node test-db-connection.js
```

You should see:
```
✅ SUCCESS! Database connection is working perfectly!
```

## ⚠️ If Password Has Special Characters

If your password contains: `@`, `:`, `/`, `#`, `&`, `?`

You need to URL-encode them:
- `@` becomes `%40`
- `:` becomes `%3A`
- `/` becomes `%2F`
- `#` becomes `%23`
- `&` becomes `%26`
- `?` becomes `%3F`

**Example:**
- Password from Supabase: `MyP@ss:123`
- In DATABASE_URL: `MyP%40ss%3A123`

## 🚀 After It Works

Once `node test-db-connection.js` shows success, run:

```bash
npm run dev
curl http://localhost:3000/health
```

Should show: `"database":"connected"` ✅

---

**Most likely issue:** You need to reset the password in Supabase Dashboard and copy the new one into your .env file.

