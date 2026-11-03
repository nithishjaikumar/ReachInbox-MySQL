import { emailWorker } from './queue/emailWorker';
import logger from './utils/logger';
import { env } from './config/env';
import prisma from './config/database';
import redis from './config/redis';

logger.info(`ReachInbox worker started with concurrency ${env.WORKER_CONCURRENCY}`);

let shuttingDown = false;
const gracefulShutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`Received ${signal}; closing worker...`);
  try {
    await emailWorker.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  } catch (error) {
    logger.error('Worker shutdown failed', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
