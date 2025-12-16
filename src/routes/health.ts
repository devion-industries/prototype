import { FastifyInstance } from 'fastify';
import db from '../db/client';
import { checkQueueHealth } from '../queue/jobs';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (_request, reply) => {
    const dbHealthy = await db.healthCheck();
    const queueHealthy = await checkQueueHealth();

    const status = dbHealthy && queueHealthy ? 'ok' : 'degraded';

    return reply.status(status === 'ok' ? 200 : 503).send({
      status,
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: queueHealthy ? 'connected' : 'disconnected',
    });
  });
}

