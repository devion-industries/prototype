import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { verifyRepoOwnership } from '../auth/ownership';
import { schemas } from '../utils/validation';
import db from '../db/client';

export default async function reposRoutes(fastify: FastifyInstance) {
  /**
   * POST /repos
   * Connects a repository for analysis
   */
  fastify.post('/repos', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const body = schemas.createRepo.parse(request.body);

    try {
      // Check if repo already exists
      const existing = await db.query(
        'SELECT id FROM repos WHERE user_id = $1 AND github_repo_id = $2',
        [req.userId, body.github_repo_id]
      );

      if (existing.rows.length > 0) {
        return reply.status(409).send({ error: 'Repository already connected' });
      }

      // Create repo
      const repoResult = await db.query(
        `INSERT INTO repos (user_id, github_repo_id, full_name, default_branch, is_private)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, full_name, default_branch, status, created_at`,
        [req.userId, body.github_repo_id, body.full_name, body.default_branch, body.is_private]
      );

      const repo = repoResult.rows[0];

      // Create default settings
      await db.query(
        `INSERT INTO repo_settings (repo_id, branch)
         VALUES ($1, $2)`,
        [repo.id, body.default_branch]
      );

      return reply.status(201).send(repo);
    } catch (error: any) {
      console.error('Create repo error:', error);
      return reply.status(500).send({
        error: 'Failed to connect repository',
        message: error.message,
      });
    }
  });

  /**
   * GET /repos
   * Lists user's connected repositories
   */
  fastify.get('/repos', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;

    try {
      const result = await db.query(
        `SELECT 
           r.id,
           r.full_name,
           r.default_branch,
           r.is_private,
           r.status,
           r.created_at,
           (SELECT finished_at FROM analysis_jobs 
            WHERE repo_id = r.id AND status = 'succeeded' 
            ORDER BY finished_at DESC LIMIT 1) as last_analyzed,
           (SELECT status FROM analysis_jobs 
            WHERE repo_id = r.id 
            ORDER BY created_at DESC LIMIT 1) as last_job_status
         FROM repos r
         WHERE r.user_id = $1
         ORDER BY r.created_at DESC`,
        [req.userId]
      );

      return reply.send({ repos: result.rows });
    } catch (error: any) {
      console.error('List repos error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch repositories',
        message: error.message,
      });
    }
  });

  /**
   * GET /repos/:repoId
   * Gets repository details
   */
  fastify.get('/repos/:repoId', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { repoId } = request.params as { repoId: string };

    if (!await verifyRepoOwnership(req.userId, repoId)) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    try {
      const result = await db.query(
        `SELECT 
           r.*,
           rs.branch,
           rs.analysis_depth,
           rs.output_tone,
           rs.ignore_paths,
           rs.schedule,
           rs.notify_email,
           rs.notify_slack,
           (SELECT json_agg(json_build_object(
             'id', aj.id,
             'status', aj.status,
             'progress', aj.progress,
             'started_at', aj.started_at,
             'finished_at', aj.finished_at,
             'error_message', aj.error_message
           ) ORDER BY aj.created_at DESC)
            FROM (SELECT * FROM analysis_jobs WHERE repo_id = r.id LIMIT 5) aj
           ) as recent_jobs
         FROM repos r
         JOIN repo_settings rs ON rs.repo_id = r.id
         WHERE r.id = $1 AND r.user_id = $2`,
        [repoId, req.userId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Repository not found' });
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      console.error('Get repo error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch repository',
        message: error.message,
      });
    }
  });

  /**
   * PATCH /repos/:repoId/settings
   * Updates repository settings
   */
  fastify.patch('/repos/:repoId/settings', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { repoId } = request.params as { repoId: string };
    const body = schemas.updateSettings.parse(request.body);

    if (!await verifyRepoOwnership(req.userId, repoId)) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    try {
      const updates: string[] = [];
      const params: any[] = [repoId];
      let paramIndex = 2;

      if (body.branch !== undefined) {
        updates.push(`branch = $${paramIndex++}`);
        params.push(body.branch);
      }
      if (body.analysis_depth !== undefined) {
        updates.push(`analysis_depth = $${paramIndex++}`);
        params.push(body.analysis_depth);
      }
      if (body.output_tone !== undefined) {
        updates.push(`output_tone = $${paramIndex++}`);
        params.push(body.output_tone);
      }
      if (body.ignore_paths !== undefined) {
        updates.push(`ignore_paths = $${paramIndex++}`);
        params.push(body.ignore_paths);
      }
      if (body.schedule !== undefined) {
        updates.push(`schedule = $${paramIndex++}`);
        params.push(body.schedule);
      }
      if (body.notify_email !== undefined) {
        updates.push(`notify_email = $${paramIndex++}`);
        params.push(body.notify_email);
      }
      if (body.notify_slack !== undefined) {
        updates.push(`notify_slack = $${paramIndex++}`);
        params.push(body.notify_slack);
      }
      if (body.slack_webhook_url !== undefined) {
        const { encrypt } = await import('../utils/encryption');
        updates.push(`slack_webhook_url_encrypted = $${paramIndex++}`);
        params.push(encrypt(body.slack_webhook_url));
      }

      if (updates.length === 0) {
        return reply.status(400).send({ error: 'No updates provided' });
      }

      await db.query(
        `UPDATE repo_settings SET ${updates.join(', ')} WHERE repo_id = $1`,
        params
      );

      return reply.send({ success: true });
    } catch (error: any) {
      console.error('Update settings error:', error);
      return reply.status(500).send({
        error: 'Failed to update settings',
        message: error.message,
      });
    }
  });
}


