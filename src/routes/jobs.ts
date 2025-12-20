import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { resolveRepoId, verifyJobOwnership } from '../auth/ownership';
import { enqueueAnalysisJob } from '../queue/jobs';
import { generateSnapshotHash, findRecentJob, createAnalysisJob } from '../analysis/idempotency';
import db from '../db/client';

export default async function jobsRoutes(fastify: FastifyInstance) {
  /**
   * POST /repos/:repoId/analyze
   * Triggers analysis job
   * Accepts either database UUID or GitHub repo ID
   */
  fastify.post('/repos/:repoId/analyze', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { repoId } = request.params as { repoId: string };

    // Resolve repoId to database UUID (handles both UUID and GitHub ID)
    const resolvedRepoId = await resolveRepoId(req.userId, repoId);
    
    if (!resolvedRepoId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    try {
      // Get repo and settings
      const repoResult = await db.query(
        `SELECT r.*, rs.branch, rs.analysis_depth, rs.output_tone, rs.ignore_paths
         FROM repos r
         JOIN repo_settings rs ON rs.repo_id = r.id
         WHERE r.id = $1`,
        [resolvedRepoId]
      );

      if (repoResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Repository not found' });
      }

      const repo = repoResult.rows[0];
      const [owner, repoName] = repo.full_name.split('/');

      // Get GitHub access token
      const tokenResult = await db.query(
        'SELECT access_token_encrypted FROM github_accounts WHERE user_id = $1 LIMIT 1',
        [req.userId]
      );

      if (tokenResult.rows.length === 0) {
        return reply.status(404).send({ error: 'No GitHub account connected' });
      }

      const accessToken = tokenResult.rows[0].access_token_encrypted;
      
      // For idempotency, using current timestamp as part of hash
      // In production, would fetch latest commit SHA
      const snapshotHash = generateSnapshotHash(
        resolvedRepoId,
        repo.branch,
        Date.now().toString(),
        repo.analysis_depth
      );

      // Check for recent job
      const existingJobId = await findRecentJob(resolvedRepoId, snapshotHash);
      if (existingJobId) {
        return reply.send({
          job_id: existingJobId,
          status: 'completed',
          message: 'Recent analysis already exists',
        });
      }

      // Create new job
      const jobId = await createAnalysisJob(resolvedRepoId, req.userId, snapshotHash, 'manual');

      // Enqueue job
      await enqueueAnalysisJob({
        jobId,
        repoId: resolvedRepoId,
        userId: req.userId,
        owner,
        repo: repoName,
        branch: repo.branch,
        depth: repo.analysis_depth,
        tone: repo.output_tone,
        ignorePaths: repo.ignore_paths || [],
        accessToken,
      });

      return reply.status(202).send({
        job_id: jobId,
        status: 'queued',
      });
    } catch (error: any) {
      console.error('Trigger analysis error:', error);
      return reply.status(500).send({
        error: 'Failed to trigger analysis',
        message: error.message,
      });
    }
  });

  /**
   * GET /jobs/:jobId
   * Gets job status
   */
  fastify.get('/jobs/:jobId', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { jobId } = request.params as { jobId: string };

    if (!await verifyJobOwnership(req.userId, jobId)) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    try {
      const result = await db.query(
        `SELECT id, status, progress, started_at, finished_at, error_message, created_at
         FROM analysis_jobs
         WHERE id = $1`,
        [jobId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      console.error('Get job error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch job',
        message: error.message,
      });
    }
  });

  /**
   * GET /repos/:repoId/jobs
   * Lists recent jobs for a repo
   * Accepts either database UUID or GitHub repo ID
   */
  fastify.get('/repos/:repoId/jobs', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { repoId } = request.params as { repoId: string };

    // Resolve repoId to database UUID (handles both UUID and GitHub ID)
    const resolvedRepoId = await resolveRepoId(req.userId, repoId);
    
    if (!resolvedRepoId) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    try {
      const result = await db.query(
        `SELECT id, status, progress, trigger, started_at, finished_at, error_message, created_at
         FROM analysis_jobs
         WHERE repo_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        [resolvedRepoId]
      );

      return reply.send({ jobs: result.rows });
    } catch (error: any) {
      console.error('List jobs error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch jobs',
        message: error.message,
      });
    }
  });
}

