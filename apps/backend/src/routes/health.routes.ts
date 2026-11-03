import { Router } from 'express';
import prisma from '../config/database';
import redis from '../config/redis';
import { checkElasticConnection } from '../config/elasticsearch';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() }));

healthRouter.get('/', async (_req, res) => {
  const services: Record<string, string> = {};
  let healthy = true;
  try { await prisma.$queryRaw`SELECT 1`; services.database = 'up'; }
  catch { services.database = 'down'; healthy = false; }
  try { await redis.ping(); services.redis = 'up'; }
  catch { services.redis = 'down'; healthy = false; }
  const elasticAvailable = await checkElasticConnection();
  services.elasticsearch = elasticAvailable ? 'up' : 'optional / disabled';
  res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'error', services, timestamp: new Date().toISOString() });
});
