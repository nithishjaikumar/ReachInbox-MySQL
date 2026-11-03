import Redis from 'ioredis';
import { env } from './env';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const getRedisConnection = () => redis;
export default redis;
