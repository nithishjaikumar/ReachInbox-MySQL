import redis from '../config/redis';
import { getNextAvailableWindow } from './rateLimitWindow';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export class RateLimitService {
  private readonly windowSeconds = 60 * 60;

  private readonly rateLimitScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local ttl = tonumber(ARGV[2])

    local current = redis.call('INCR', key)

    if current == 1 then
      redis.call('EXPIRE', key, ttl)
    end

    if current > limit then
      redis.call('DECR', key)
      return {0, 0}
    end

    return {1, limit - current}
  `;

  async checkAndIncrementRate(
    senderId: string,
    hourlyLimit: number,
  ): Promise<RateLimitResult> {
    if (!Number.isInteger(hourlyLimit) || hourlyLimit <= 0) {
      throw new Error('Hourly limit must be a positive integer');
    }

    const now = new Date();

    // Use a UTC calendar-hour window.
    const windowStart = new Date(now);
    windowStart.setUTCMinutes(0, 0, 0);

    const windowId = windowStart.toISOString().slice(0, 13);

    const key = `rate-limit:${senderId}:${windowId}`;

    const result = (await redis.eval(
      this.rateLimitScript,
      1,
      key,
      hourlyLimit,
      this.windowSeconds,
    )) as [number, number];

    const allowed = result[0] === 1;
    const remaining = Math.max(0, Number(result[1]));

    // The next UTC hour is when this hourly window ends.
    const resetAt = new Date(windowStart);
    resetAt.setUTCHours(resetAt.getUTCHours() + 1);

    return {
      allowed,
      remaining,
      resetAt,
    };
  }

  getNextAvailableWindow(): Date {
    return getNextAvailableWindow();
  }
}

export const rateLimitService = new RateLimitService();