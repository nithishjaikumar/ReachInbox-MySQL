import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const emailQueue = new Queue('email-queue', {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});
