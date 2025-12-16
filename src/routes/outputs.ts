import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { verifyRepoOwnership, verifyOutputOwnership } from '../auth/ownership';
import db from '../db/client';

export default async function outputsRoutes(fastify: FastifyInstance) {
  /**
   * GET /repos/:repoId/outputs/latest
   * Gets latest outputs for all 4 types
   */
  fastify.get('/repos/:repoId/outputs/latest', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { repoId } = request.params as { repoId: string };

    if (!await verifyRepoOwnership(req.userId, repoId)) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    try {
      const result = await db.query(
        `SELECT DISTINCT ON (type)
           id, type, content_markdown, confidence, sources_json, created_at
         FROM analysis_outputs
         WHERE repo_id = $1
         ORDER BY type, created_at DESC`,
        [repoId]
      );

      const outputs = {
        maintainer_brief: null,
        contributor_quickstart: null,
        release_summary: null,
        good_first_issues: null,
      };

      for (const row of result.rows) {
        outputs[row.type as keyof typeof outputs] = row;
      }

      return reply.send(outputs);
    } catch (error: any) {
      console.error('Get latest outputs error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch outputs',
        message: error.message,
      });
    }
  });

  /**
   * GET /outputs/:outputId
   * Gets specific output
   */
  fastify.get('/outputs/:outputId', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { outputId } = request.params as { outputId: string };

    if (!await verifyOutputOwnership(req.userId, outputId)) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    try {
      const result = await db.query(
        `SELECT 
           ao.*,
           r.full_name as repo_full_name,
           aj.finished_at as generated_at
         FROM analysis_outputs ao
         JOIN repos r ON r.id = ao.repo_id
         JOIN analysis_jobs aj ON aj.id = ao.job_id
         WHERE ao.id = $1`,
        [outputId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Output not found' });
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      console.error('Get output error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch output',
        message: error.message,
      });
    }
  });
}

