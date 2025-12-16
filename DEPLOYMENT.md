# Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL (via Supabase)
- Redis
- GitHub OAuth App
- OpenAI API Key

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in all required variables
3. Generate encryption key: `openssl rand -hex 32`

## Local Development

```bash
# Install dependencies
npm install

# Run migrations
npm run build
npm run migrate

# Start services
npm run dev          # API server (with hot reload)
npm run worker       # Job worker
npm run scheduler    # Scheduler
```

## Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Railway Deployment

### 1. Database Setup (Supabase)

1. Create a Supabase project
2. Run the migration SQL from `src/db/migrations/001_initial_schema.sql`
3. Get connection string from Supabase dashboard

### 2. Redis Setup

Add Redis service in Railway:
- Use Redis template
- Copy connection URL

### 3. API Server

1. Create new service in Railway
2. Connect GitHub repository
3. Set environment variables (all from `.env.example`)
4. Set start command: `npm run build && npm start`
5. Deploy

### 4. Worker Service

1. Create another service (same repo)
2. Same environment variables
3. Set start command: `npm run build && npm run worker`
4. Deploy

### 5. Scheduler Service

1. Create another service (same repo)
2. Same environment variables
3. Set start command: `npm run build && npm run scheduler`
4. Deploy

## Vercel/Netlify (Serverless)

This backend is NOT designed for serverless deployment due to:
- Long-running analysis jobs
- Worker processes
- Scheduled tasks

Use Railway, Render, or traditional hosting instead.

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `ENCRYPTION_KEY`
- [ ] Configure SMTP for emails
- [ ] Set up monitoring (e.g., Sentry)
- [ ] Configure rate limits
- [ ] Set up log aggregation
- [ ] Enable HTTPS
- [ ] Restrict CORS to production frontend URL
- [ ] Set up database backups
- [ ] Configure Redis persistence
- [ ] Set up health check monitoring
- [ ] Document API endpoints for frontend team

## Scaling

### Horizontal Scaling

- Run multiple API instances behind a load balancer
- Run multiple worker instances for parallel processing
- Keep only 1 scheduler instance

### Vertical Scaling

- Increase `MAX_CONCURRENT_JOBS` for workers
- Increase Redis memory
- Increase database connection pool size

### Performance Tuning

- Adjust `IDEMPOTENCY_WINDOW_HOURS` to reduce duplicate work
- Configure BullMQ concurrency per job type
- Implement caching for GitHub API responses
- Use read replicas for database queries

## Monitoring

### Key Metrics

- API response times
- Job queue depth
- Job success/failure rate
- GitHub API rate limit remaining
- OpenAI API usage
- Database connection pool usage
- Redis memory usage

### Recommended Tools

- **APM**: Sentry, New Relic, or Datadog
- **Logs**: Logtail, Papertrail, or CloudWatch
- **Uptime**: UptimeRobot, Pingdom
- **Metrics**: Prometheus + Grafana

## Troubleshooting

### Jobs Stuck in Queue

1. Check worker logs
2. Verify Redis connection
3. Check GitHub token validity
4. Verify OpenAI API key

### High Memory Usage

1. Check for memory leaks in worker
2. Reduce `MAX_CONCURRENT_JOBS`
3. Increase worker instances

### Database Connection Errors

1. Check connection string
2. Verify database is accessible
3. Check connection pool settings
4. Review RLS policies in Supabase

### GitHub Rate Limits

1. Implement better caching
2. Reduce analysis frequency
3. Use GitHub Apps instead of OAuth (higher limits)

## Backup & Recovery

### Database Backups

Supabase provides automatic daily backups. Additional steps:

1. Set up point-in-time recovery
2. Test restore procedures
3. Document recovery time objectives

### Redis Backups

Configure Redis persistence:

```yaml
redis:
  command: redis-server --appendonly yes
```

### Job Recovery

Failed jobs are automatically retried 3 times with exponential backoff.

Manual recovery:
```bash
# Re-trigger failed jobs
node scripts/retry-failed-jobs.js
```

## Security

### Regular Updates

- Keep dependencies updated
- Monitor security advisories
- Run `npm audit` regularly

### Access Control

- Rotate encryption keys periodically
- Use least-privilege database roles
- Implement IP whitelisting if needed
- Enable 2FA for all admin accounts

### Compliance

- GDPR: Implement data deletion endpoints
- SOC 2: Enable audit logging
- HIPAA: Not applicable (no health data)

## Cost Optimization

### OpenAI Costs

- Use `gpt-4-turbo` instead of `gpt-4` (cheaper)
- Implement output caching
- Set appropriate `max_tokens` limits

### GitHub API

- Cache responses
- Use conditional requests
- Batch API calls where possible

### Database

- Implement data retention policies
- Archive old analysis outputs
- Use appropriate indexes

## Support

For deployment issues:
- Check logs: `docker-compose logs`
- Health endpoint: `GET /health`
- Database status: `SELECT 1`

Contact: support@maintainerbrief.com

