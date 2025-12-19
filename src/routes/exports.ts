import { FastifyInstance } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../auth/middleware';
import { verifyOutputOwnership } from '../auth/ownership';
import { enqueueExportJob } from '../queue/jobs';
import { schemas } from '../utils/validation';
import db from '../db/client';

export default async function exportsRoutes(fastify: FastifyInstance) {
  /**
   * POST /outputs/:outputId/export
   * Creates export request
   */
  fastify.post('/outputs/:outputId/export', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { outputId } = request.params as { outputId: string };
    const body = schemas.exportRequest.parse(request.body);

    if (!await verifyOutputOwnership(req.userId, outputId)) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    try {
      // Get output content and repo info
      const outputResult = await db.query(
        `SELECT ao.content_markdown, r.full_name
         FROM analysis_outputs ao
         JOIN repos r ON r.id = ao.repo_id
         WHERE ao.id = $1`,
        [outputId]
      );

      if (outputResult.rows.length === 0) {
        return reply.status(404).send({ error: 'Output not found' });
      }

      const { content_markdown, full_name } = outputResult.rows[0];

      // Create export request
      const exportResult = await db.query(
        `INSERT INTO export_requests (output_id, format, status)
         VALUES ($1, $2, 'queued')
         RETURNING id`,
        [outputId, body.format]
      );

      const exportId = exportResult.rows[0].id;

      // Enqueue export job
      await enqueueExportJob({
        exportId,
        outputId,
        format: body.format,
        content: content_markdown,
        repoFullName: full_name,
      });

      return reply.status(202).send({
        export_id: exportId,
        status: 'queued',
      });
    } catch (error: any) {
      console.error('Create export error:', error);
      return reply.status(500).send({
        error: 'Failed to create export',
        message: error.message,
      });
    }
  });

  /**
   * GET /exports/:exportId
   * Gets export status
   */
  fastify.get('/exports/:exportId', requireAuth(), async (request, reply) => {
    const req = request as AuthenticatedRequest;
    const { exportId } = request.params as { exportId: string };

    try {
      const result = await db.query(
        `SELECT er.*
         FROM export_requests er
         JOIN analysis_outputs ao ON ao.id = er.output_id
         JOIN repos r ON r.id = ao.repo_id
         WHERE er.id = $1 AND r.user_id = $2`,
        [exportId, req.userId]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ error: 'Export not found' });
      }

      return reply.send(result.rows[0]);
    } catch (error: any) {
      console.error('Get export error:', error);
      return reply.status(500).send({
        error: 'Failed to fetch export',
        message: error.message,
      });
    }
  });
}


