import app from './app';
import { env } from './config/env';
import logger from './utils/logger';
import { elasticsearchService } from './services/elasticsearch.service';
import prisma from './config/database';
import redis from './config/redis';
import { emailQueue } from './queue/emailQueue';

const server = app.listen(env.PORT, () => logger.info(`ReachInbox API listening on port ${env.PORT}`));

// Elasticsearch is optional; its service degrades to MySQL search.
void elasticsearchService.ensureIndex();

const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}; shutting down API...`);
  server.close(async () => {
    try {
      await emailQueue.close();
      await prisma.$disconnect();
      await redis.quit();
      logger.info('API shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during API shutdown', error);
      process.exit(1);
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
