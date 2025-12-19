import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import config from './config';

// Route imports
import healthRoutes from './routes/health';
import githubRoutes from './routes/github';
import githubAppRoutes from './routes/github-app';
import webhookRoutes from './routes/webhooks';
import reposRoutes from './routes/repos';
import jobsRoutes from './routes/jobs';
import outputsRoutes from './routes/outputs';
import exportsRoutes from './routes/exports';

const fastify = Fastify({
  logger: config.NODE_ENV === 'development' ? {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  } : true,
});

async function start() {
  try {
    // Register plugins
    await fastify.register(helmet, {
      contentSecurityPolicy: false,
    });

    await fastify.register(cors, {
      origin: (origin, cb) => {
        // Allow configured frontend URL
        if (origin === config.FRONTEND_URL) {
          cb(null, true);
          return;
        }
        // Allow all Vercel preview deployments for this project
        if (origin && origin.match(/^https:\/\/repo-insights-[a-z0-9]+-developmentdevion-gmailcoms-projects\.vercel\.app$/)) {
          cb(null, true);
          return;
        }
        // Allow localhost for development
        if (origin && origin.match(/^http:\/\/localhost:\d+$/)) {
          cb(null, true);
          return;
        }
        // Reject all other origins
        cb(new Error('Not allowed by CORS'), false);
      },
      credentials: true,
    });

    await fastify.register(rateLimit, {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW,
    });

    // Register routes
    await fastify.register(healthRoutes);
    await fastify.register(githubRoutes); // Legacy OAuth routes (will be removed)
    await fastify.register(githubAppRoutes); // New GitHub App routes
    await fastify.register(webhookRoutes); // GitHub App webhooks
    await fastify.register(reposRoutes);
    await fastify.register(jobsRoutes);
    await fastify.register(outputsRoutes);
    await fastify.register(exportsRoutes);

    // Error handler
    fastify.setErrorHandler((error, _request, reply) => {
      fastify.log.error(error);

      if (error.validation) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
          details: error.validation,
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: config.NODE_ENV === 'development' ? error.message : 'An error occurred',
      });
    });

    // Start server
    await fastify.listen({
      port: config.PORT,
      host: config.HOST,
    });

    console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Maintainer Brief Backend                ║
║                                               ║
║   Server:  http://${config.HOST}:${config.PORT}        ║
║   Env:     ${config.NODE_ENV}                      ║
║                                               ║
║   Health:  GET /health                        ║
║   Docs:    See README.md                      ║
╚═══════════════════════════════════════════════╝
    `);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    console.log(`\n${signal} received, closing server...`);
    await fastify.close();
    process.exit(0);
  });
});

// Start server
start();

export default fastify;

