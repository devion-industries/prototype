import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  HOST: z.string().default('0.0.0.0'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // OpenAI
  OPENAI_API_KEY: z.string().startsWith('sk-'),

  // GitHub OAuth (Legacy - will be removed)
  GITHUB_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),

  // GitHub App
  GITHUB_APP_ID: z.string().min(1),
  GITHUB_APP_SLUG: z.string().min(1).default('devion-dev'), // The app's URL slug (e.g., 'devion-dev' from github.com/apps/devion-dev)
  GITHUB_PRIVATE_KEY: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),

  // Encryption (32-byte hex key = 64 characters)
  ENCRYPTION_KEY: z.string().length(64),

  // Email (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default('60000'),

  // Job Configuration
  MAX_CONCURRENT_JOBS: z.string().transform(Number).default('5'),
  JOB_TIMEOUT_MS: z.string().transform(Number).default('600000'),
  IDEMPOTENCY_WINDOW_HOURS: z.string().transform(Number).default('24'),

  // Scheduler Configuration
  SCHEDULER_START_HOUR: z.string().transform(Number).default('0'),
  SCHEDULER_END_HOUR: z.string().transform(Number).default('23'),
  SCHEDULER_TIMEZONE: z.string().default('UTC'),

  // Frontend
  FRONTEND_URL: z.string().url(),
});

export type Config = z.infer<typeof configSchema>;

let config: Config;

try {
  config = configSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment configuration:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default config;

