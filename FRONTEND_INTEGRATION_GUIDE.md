# 🎨 Frontend Integration Guide

## 🎉 Your Backend is Ready!

**Status:** ✅ Operational  
**API URL:** `http://localhost:3000`  
**Health Check:** `GET /health` → 200 OK

---

## 📋 What's Working Right Now

### ✅ Ready to Use:
- **User Authentication** (Supabase Auth)
- **GitHub OAuth** (Real credentials configured)
- **Database** (PostgreSQL with 7 tables)
- **Job Queue** (Redis + BullMQ)
- **All 14 API Endpoints** (documented below)

### ⏳ Needs OpenAI Key:
- AI Analysis Features (will work once OpenAI key is fixed)

---

## 🔐 Authentication Flow

### Step 1: Configure Supabase in Frontend

```typescript
// frontend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ygudmijcffyuarwoywmq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndWRtaWpjZmZ5dWFyd295d21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODk2MTEsImV4cCI6MjA4MTQ2NTYxMX0.d4cA5PM-LeR-L2khnjtKQU-xQsteQdLYLPkaYgyO_ME'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 2: User Signup/Login

```typescript
// Sign up new user
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123'
})

// Sign in existing user
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123'
})

// Get session token
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token // Use this for API calls
```

### Step 3: Make API Calls

```typescript
// Example: Get user's connected repos
const response = await fetch('http://localhost:3000/repos', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})

const repos = await response.json()
```

---

## 🛣️ Available API Endpoints

### Public Endpoints

#### Health Check
```bash
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2025-12-17T03:06:04.858Z",
  "database": "connected",
  "redis": "connected"
}
```

---

### GitHub Integration (Protected)

#### Connect GitHub Account
```typescript
POST /github/connect
Headers: Authorization: Bearer <jwt-token>
Body: {
  "code": "github-oauth-code-from-callback"
}

Response:
{
  "id": "uuid",
  "github_login": "username",
  "created_at": "2025-12-17T..."
}
```

**OAuth Flow:**
1. Redirect user to: `https://github.com/login/oauth/authorize?client_id=Ov23liJKTDzLdQCD7Hc4&redirect_uri=http://localhost:3000/github/callback`
2. GitHub redirects back with code
3. Send code to `/github/connect`
4. Backend exchanges code for token and stores it encrypted

#### List User's GitHub Repos
```typescript
GET /github/repos
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "repos": [
    {
      "id": 123456,
      "full_name": "owner/repo",
      "default_branch": "main",
      "private": false,
      "description": "...",
      "language": "TypeScript",
      "stargazers_count": 100
    }
  ]
}
```

---

### Repository Management (Protected)

#### Connect a Repository
```typescript
POST /repos
Headers: Authorization: Bearer <jwt-token>
Body: {
  "full_name": "owner/repo",
  "github_repo_id": "123456",
  "default_branch": "main",
  "is_private": false
}

Response:
{
  "id": "uuid",
  "full_name": "owner/repo",
  "status": "active",
  "created_at": "2025-12-17T..."
}
```

#### List Connected Repos
```typescript
GET /repos
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "repos": [
    {
      "id": "uuid",
      "full_name": "owner/repo",
      "default_branch": "main",
      "is_private": false,
      "status": "active",
      "last_analyzed": "2025-12-17T...",
      "last_job_status": "succeeded"
    }
  ]
}
```

#### Get Repo Details
```typescript
GET /repos/:repoId
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "id": "uuid",
  "full_name": "owner/repo",
  "settings": {
    "branch": "main",
    "analysis_depth": "fast",
    "output_tone": "concise",
    "schedule": "manual"
  },
  "recent_jobs": [...]
}
```

#### Update Repo Settings
```typescript
PATCH /repos/:repoId/settings
Headers: Authorization: Bearer <jwt-token>
Body: {
  "analysis_depth": "deep",
  "output_tone": "detailed",
  "ignore_paths": ["node_modules/**", "dist/**"],
  "schedule": "weekly",
  "notify_email": true
}

Response:
{
  "success": true
}
```

---

### Analysis Jobs (Protected)

#### Trigger Analysis
```typescript
POST /repos/:repoId/analyze
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "job_id": "uuid",
  "status": "queued"
}

⚠️  NOTE: Requires valid OpenAI API key
```

#### Get Job Status
```typescript
GET /jobs/:jobId
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "id": "uuid",
  "status": "running",  // queued | running | succeeded | failed
  "progress": 60,       // 0-100
  "started_at": "...",
  "finished_at": null,
  "error_message": null
}
```

#### List Repo Jobs
```typescript
GET /repos/:repoId/jobs
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "jobs": [
    {
      "id": "uuid",
      "status": "succeeded",
      "progress": 100,
      "trigger": "manual",
      "created_at": "..."
    }
  ]
}
```

---

### Outputs (Protected)

#### Get Latest Outputs
```typescript
GET /repos/:repoId/outputs/latest
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "maintainer_brief": {
    "id": "uuid",
    "type": "maintainer_brief",
    "content_markdown": "# Maintainer Brief\n...",
    "confidence": 0.92,
    "created_at": "..."
  },
  "contributor_quickstart": { ... },
  "release_summary": { ... },
  "good_first_issues": { ... }
}
```

#### Get Specific Output
```typescript
GET /outputs/:outputId
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "id": "uuid",
  "type": "maintainer_brief",
  "content_markdown": "...",
  "confidence": 0.92,
  "sources_json": {
    "commits": ["sha1", "sha2"],
    "prs": [123, 456]
  }
}
```

---

### Exports (Protected)

#### Create Export
```typescript
POST /outputs/:outputId/export
Headers: Authorization: Bearer <jwt-token>
Body: {
  "format": "markdown"  // markdown | pdf | github_release
}

Response:
{
  "export_id": "uuid",
  "status": "queued"
}
```

#### Get Export Status
```typescript
GET /exports/:exportId
Headers: Authorization: Bearer <jwt-token>

Response:
{
  "id": "uuid",
  "status": "succeeded",
  "file_url": "/exports/repo-name-timestamp.md",
  "completed_at": "..."
}
```

---

## 🔧 Frontend Configuration

### Environment Variables

Create `.env.local` in your frontend:

```env
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://ygudmijcffyuarwoywmq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlndWRtaWpjZmZ5dWFyd295d21xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4ODk2MTEsImV4cCI6MjA4MTQ2NTYxMX0.d4cA5PM-LeR-L2khnjtKQU-xQsteQdLYLPkaYgyO_ME
VITE_GITHUB_CLIENT_ID=Ov23liJKTDzLdQCD7Hc4
VITE_GITHUB_CALLBACK=http://localhost:3000/github/callback
```

---

## 📦 Sample API Client

```typescript
// frontend/src/lib/api.ts
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

export const api = {
  // Health check
  async health() {
    const res = await fetch(`${API_URL}/health`)
    return res.json()
  },

  // Get repos
  async getRepos() {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}/repos`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    return res.json()
  },

  // Connect repo
  async connectRepo(repoData: any) {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}/repos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(repoData)
    })
    return res.json()
  },

  // Trigger analysis
  async analyzeRepo(repoId: string) {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}/repos/${repoId}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    return res.json()
  },

  // Get job status
  async getJobStatus(jobId: string) {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    return res.json()
  },

  // Get outputs
  async getLatestOutputs(repoId: string) {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}/repos/${repoId}/outputs/latest`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    return res.json()
  }
}
```

---

## 🧪 Testing the Integration

### Test 1: Health Check
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok",...}
```

### Test 2: Sign Up User
```typescript
// In your frontend
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'TestPassword123!'
})
```

### Test 3: Make Authenticated Request
```typescript
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token

const response = await fetch('http://localhost:3000/repos', {
  headers: { 'Authorization': `Bearer ${token}` }
})

console.log(await response.json())
```

---

## 🚨 Error Handling

### Common Errors

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header"
}
```
**Solution:** Ensure JWT token is included in Authorization header

#### 403 Forbidden
```json
{
  "error": "Access denied"
}
```
**Solution:** User doesn't own the resource

#### 404 Not Found
```json
{
  "error": "Repository not found"
}
```
**Solution:** Resource doesn't exist

#### 429 Rate Limit
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded"
}
```
**Solution:** Wait and retry (100 req/min limit)

---

## 🔄 Complete User Flow Example

### 1. User Signs Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: user.email,
  password: user.password
})
```

### 2. Connect GitHub
```typescript
// Redirect to GitHub
window.location.href = `https://github.com/login/oauth/authorize?client_id=Ov23liJKTDzLdQCD7Hc4&redirect_uri=http://localhost:3000/github/callback&scope=repo,read:user`

// After callback, send code to backend
const response = await api.connectGitHub(code)
```

### 3. List & Add Repo
```typescript
// Get available repos from GitHub
const { repos } = await api.getGitHubRepos()

// Connect a repo
await api.connectRepo({
  full_name: 'owner/repo',
  github_repo_id: repos[0].id,
  default_branch: 'main',
  is_private: false
})
```

### 4. View Connected Repos
```typescript
const { repos } = await api.getRepos()
```

### 5. Trigger Analysis (when OpenAI key is fixed)
```typescript
const { job_id } = await api.analyzeRepo(repoId)

// Poll for status
const interval = setInterval(async () => {
  const job = await api.getJobStatus(job_id)
  if (job.status === 'succeeded' || job.status === 'failed') {
    clearInterval(interval)
    // Show results
  }
}, 5000)
```

### 6. View Outputs
```typescript
const outputs = await api.getLatestOutputs(repoId)
// Display maintainer_brief, contributor_quickstart, etc.
```

---

## 📍 CORS Configuration

Backend CORS is configured for:
- **Origin:** `http://localhost:5173` (Vite default)
- **Credentials:** Enabled

If your frontend runs on a different port, update backend `.env`:
```env
FRONTEND_URL=http://localhost:YOUR_PORT
```

---

## ✅ What Works Right Now

You can build and test these features immediately:

1. ✅ **Authentication UI** - Login/Signup with Supabase
2. ✅ **GitHub OAuth Flow** - Connect GitHub account
3. ✅ **Repository List** - Browse user's GitHub repos
4. ✅ **Add Repositories** - Connect repos for tracking
5. ✅ **Settings Management** - Configure repo settings
6. ✅ **Job History** - View past analysis jobs
7. ✅ **Dashboard** - Show connected repos and stats

---

## ⏳ Coming Soon (Needs OpenAI Key)

Once you fix the OpenAI API key:

8. ✅ **Trigger Analysis** - Run AI analysis
9. ✅ **Real-time Progress** - Show job progress (0-100%)
10. ✅ **View Outputs** - Display AI-generated content
11. ✅ **Export Features** - Download as markdown/PDF

---

## 🚀 Quick Start Command

In your frontend directory:

```bash
# Install dependencies
npm install @supabase/supabase-js

# Configure environment
cp .env.example .env.local
# Edit .env.local with values above

# Start frontend
npm run dev

# Backend is already running on http://localhost:3000
```

---

## 🆘 Need Help?

Check these first:
1. Backend health: `curl http://localhost:3000/health`
2. Supabase connection: Check browser console for errors
3. JWT token: Log `session.access_token` to verify
4. CORS: Ensure frontend URL matches backend FRONTEND_URL

---

**Your backend is ready and waiting for frontend connections! 🎉**

Connect your frontend and start building the UI. The AI analysis features will work as soon as you update the OpenAI key.
