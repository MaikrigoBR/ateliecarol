import IORedis from 'ioredis';
import { Queue, Worker } from 'bullmq';
import { platformDefaults } from '@catechesis-saas/config';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null
});

export const billingQueue = new Queue('billing-recurring', {
  connection
});

export const settlementQueue = new Queue('tenant-settlement', {
  connection
});

const billingWorker = new Worker(
  'billing-recurring',
  async (job) => {
    console.log('[billing-recurring]', job.name, job.data);
    return {
      retryPolicy: platformDefaults.billing.retryPolicy,
      processedAt: new Date().toISOString()
    };
  },
  { connection }
);

const settlementWorker = new Worker(
  'tenant-settlement',
  async (job) => {
    console.log('[tenant-settlement]', job.name, job.data);
    return {
      mode: 'hybrid',
      processedAt: new Date().toISOString()
    };
  },
  { connection }
);

Promise.all([billingWorker.waitUntilReady(), settlementWorker.waitUntilReady()])
  .then(() => {
    console.log('Catechesis SaaS worker online');
  })
  .catch((error) => {
    console.error('Failed to start workers', error);
    process.exitCode = 1;
  });
