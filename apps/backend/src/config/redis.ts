import Redis from 'ioredis';
import { env } from './env';

const isTls = env.REDIS_URL.startsWith('rediss://');

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  ...(isTls ? { tls: {} } : {}),
});

export const getRedisConnection = () => redis;
export default redis;

