# API Examples

Complete examples for testing all endpoints with curl.

## Setup

```bash
# Set your tokens
export SUPABASE_TOKEN="your-supabase-jwt-token"
export API_URL="http://localhost:3000"
```

## 1. Health Check

```bash
curl $API_URL/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-16T...",
  "database": "connected",
  "redis": "connected"
}
```

## 2. Connect GitHub Account

```bash
curl -X POST $API_URL/github/connect \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "github_oauth_code_from_redirect"
  }'
```

Or with personal access token:
```bash
curl -X POST $API_URL/github/connect \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ghp_your_github_token"
  }'
```

Response:
```json
{
  "id": "uuid",
  "github_login": "username",
  "created_at": "2025-12-16T..."
}
```

## 3. List GitHub Repositories

```bash
curl $API_URL/github/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response:
```json
{
  "repos": [
    {
      "id": 123456,
      "full_name": "owner/repo",
      "default_branch": "main",
      "private": false,
      "description": "Repository description",
      "language": "TypeScript",
      "stargazers_count": 100,
      "updated_at": "2025-12-16T..."
    }
  ]
}
```

## 4. Connect a Repository

```bash
curl -X POST $API_URL/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "facebook/react",
    "github_repo_id": "10270250",
    "default_branch": "main",
    "is_private": false
  }'
```

Response:
```json
{
  "id": "uuid",
  "full_name": "facebook/react",
  "default_branch": "main",
  "status": "active",
  "created_at": "2025-12-16T..."
}
```

## 5. List Connected Repositories

```bash
curl $API_URL/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response:
```json
{
  "repos": [
    {
      "id": "uuid",
      "full_name": "facebook/react",
      "default_branch": "main",
      "is_private": false,
      "status": "active",
      "created_at": "2025-12-16T...",
      "last_analyzed": "2025-12-16T...",
      "last_job_status": "succeeded"
    }
  ]
}
```

## 6. Get Repository Details

```bash
export REPO_ID="your-repo-uuid"

curl $API_URL/repos/$REPO_ID \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response:
```json
{
  "id": "uuid",
  "full_name": "facebook/react",
  "default_branch": "main",
  "is_private": false,
  "status": "active",
  "branch": "main",
  "analysis_depth": "fast",
  "output_tone": "concise",
  "ignore_paths": [],
  "schedule": "manual",
  "notify_email": false,
  "notify_slack": false,
  "recent_jobs": [
    {
      "id": "uuid",
      "status": "succeeded",
      "progress": 100,
      "started_at": "2025-12-16T...",
      "finished_at": "2025-12-16T...",
      "error_message": null
    }
  ]
}
```

## 7. Update Repository Settings

```bash
curl -X PATCH $API_URL/repos/$REPO_ID/settings \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_depth": "deep",
    "output_tone": "detailed",
    "ignore_paths": ["node_modules/**", "dist/**", "*.test.ts"],
    "schedule": "weekly",
    "notify_email": true
  }'
```

Response:
```json
{
  "success": true
}
```

## 8. Trigger Analysis

```bash
curl -X POST $API_URL/repos/$REPO_ID/analyze \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response:
```json
{
  "job_id": "uuid",
  "status": "queued"
}
```

## 9. Check Job Status

```bash
export JOB_ID="your-job-uuid"

curl $API_URL/jobs/$JOB_ID \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response (while running):
```json
{
  "id": "uuid",
  "status": "running",
  "progress": 60,
  "started_at": "2025-12-16T12:00:00Z",
  "finished_at": null,
  "error_message": null,
  "created_at": "2025-12-16T12:00:00Z"
}
```

Response (completed):
```json
{
  "id": "uuid",
  "status": "succeeded",
  "progress": 100,
  "started_at": "2025-12-16T12:00:00Z",
  "finished_at": "2025-12-16T12:05:00Z",
  "error_message": null,
  "created_at": "2025-12-16T12:00:00Z"
}
```

## 10. List Jobs for Repository

```bash
curl $API_URL/repos/$REPO_ID/jobs \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response:
```json
{
  "jobs": [
    {
      "id": "uuid",
      "status": "succeeded",
      "progress": 100,
      "trigger": "manual",
      "started_at": "2025-12-16T...",
      "finished_at": "2025-12-16T...",
      "error_message": null,
      "created_at": "2025-12-16T..."
    }
  ]
}
```

## 11. Get Latest Outputs

```bash
curl $API_URL/repos/$REPO_ID/outputs/latest \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response:
```json
{
  "maintainer_brief": {
    "id": "uuid",
    "type": "maintainer_brief",
    "content_markdown": "# Maintainer Brief\n\n## Summary\n...",
    "confidence": 0.92,
    "sources_json": {
      "commits": ["sha1", "sha2"],
      "prs": [123, 456],
      "issues": []
    },
    "created_at": "2025-12-16T..."
  },
  "contributor_quickstart": { ... },
  "release_summary": { ... },
  "good_first_issues": { ... }
}
```

## 12. Get Specific Output

```bash
export OUTPUT_ID="your-output-uuid"

curl $API_URL/outputs/$OUTPUT_ID \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response:
```json
{
  "id": "uuid",
  "type": "maintainer_brief",
  "content_markdown": "# Maintainer Brief\n\n...",
  "confidence": 0.92,
  "sources_json": {
    "commits": ["sha1", "sha2"],
    "prs": [123, 456],
    "issues": []
  },
  "repo_full_name": "facebook/react",
  "generated_at": "2025-12-16T...",
  "created_at": "2025-12-16T..."
}
```

## 13. Export Output

```bash
curl -X POST $API_URL/outputs/$OUTPUT_ID/export \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "markdown"
  }'
```

Response:
```json
{
  "export_id": "uuid",
  "status": "queued"
}
```

## 14. Check Export Status

```bash
export EXPORT_ID="your-export-uuid"

curl $API_URL/exports/$EXPORT_ID \
  -H "Authorization: Bearer $SUPABASE_TOKEN"
```

Response (completed):
```json
{
  "id": "uuid",
  "output_id": "uuid",
  "format": "markdown",
  "status": "succeeded",
  "file_url": "/exports/facebook-react-1703001234567.md",
  "created_at": "2025-12-16T...",
  "completed_at": "2025-12-16T..."
}
```

## Complete Workflow Example

```bash
#!/bin/bash

# 1. Setup
export SUPABASE_TOKEN="your-token"
export API_URL="http://localhost:3000"

# 2. Connect GitHub (use your personal access token)
echo "Connecting GitHub account..."
GITHUB_RESPONSE=$(curl -s -X POST $API_URL/github/connect \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token": "ghp_your_token"}')
echo $GITHUB_RESPONSE

# 3. List available repos
echo "Fetching GitHub repos..."
curl -s $API_URL/github/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN" | jq '.repos[0:3]'

# 4. Connect a repo
echo "Connecting repository..."
REPO_RESPONSE=$(curl -s -X POST $API_URL/repos \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "octocat/Hello-World",
    "github_repo_id": "1296269",
    "default_branch": "master",
    "is_private": false
  }')
echo $REPO_RESPONSE

REPO_ID=$(echo $REPO_RESPONSE | jq -r '.id')
echo "Repo ID: $REPO_ID"

# 5. Update settings
echo "Updating settings..."
curl -s -X PATCH $API_URL/repos/$REPO_ID/settings \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_depth": "deep",
    "output_tone": "detailed",
    "notify_email": true
  }' | jq '.'

# 6. Trigger analysis
echo "Starting analysis..."
JOB_RESPONSE=$(curl -s -X POST $API_URL/repos/$REPO_ID/analyze \
  -H "Authorization: Bearer $SUPABASE_TOKEN")
echo $JOB_RESPONSE

JOB_ID=$(echo $JOB_RESPONSE | jq -r '.job_id')
echo "Job ID: $JOB_ID"

# 7. Poll job status
echo "Waiting for job to complete..."
while true; do
  STATUS=$(curl -s $API_URL/jobs/$JOB_ID \
    -H "Authorization: Bearer $SUPABASE_TOKEN" | jq -r '.status')
  PROGRESS=$(curl -s $API_URL/jobs/$JOB_ID \
    -H "Authorization: Bearer $SUPABASE_TOKEN" | jq -r '.progress')
  
  echo "Status: $STATUS, Progress: $PROGRESS%"
  
  if [ "$STATUS" = "succeeded" ] || [ "$STATUS" = "failed" ]; then
    break
  fi
  
  sleep 5
done

# 8. Get outputs
if [ "$STATUS" = "succeeded" ]; then
  echo "Fetching outputs..."
  curl -s $API_URL/repos/$REPO_ID/outputs/latest \
    -H "Authorization: Bearer $SUPABASE_TOKEN" | jq '.maintainer_brief.content_markdown'
fi
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authorization header"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Repository not found"
}
```

### 409 Conflict
```json
{
  "error": "Repository already connected"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Failed to process request"
}
```

### Rate Limit
```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded"
}
```


