import { QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import config from '../config';

// Create Redis connection
export function createRedisConnection(): IORedis {
  const redis = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10000, // 10 seconds
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('error', (error) => {
    // Only log if it's not a common timeout error to reduce log spam
    if (error.message?.includes('ETIMEDOUT')) {
      console.warn('⚠️ Redis connection timeout, retrying...');
    } else {
      console.error('Redis connection error:', error);
    }
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  return redis;
}

export const redisConnection = createRedisConnection();

export const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // 24 hours
    },
    removeOnFail: {
      count: 1000,
      age: 7 * 24 * 3600, // 7 days
    },
  },
};

export const workerOptions: WorkerOptions = {
  connection: redisConnection,
  concurrency: config.MAX_CONCURRENT_JOBS,
  limiter: {
    max: config.MAX_CONCURRENT_JOBS,
    duration: 1000,
  },
};

