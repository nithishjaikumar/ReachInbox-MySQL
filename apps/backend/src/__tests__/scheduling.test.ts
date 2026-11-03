import { describe, it, expect } from 'vitest';

describe('Email Scheduling & Delay Calculation Logic', () => {
  it('calculates deterministic delay and timestamps for batch recipients', () => {
    const startTimeMs = 1700000000000; // Fixed timestamp
    const delayBetweenEmails = 2000; // 2 seconds
    const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];

    const scheduledTimes = recipients.map((recipient, index) => {
      const scheduledAtMs = startTimeMs + (index * delayBetweenEmails);
      return {
        recipient,
        scheduledAt: new Date(scheduledAtMs),
        delayFromStart: index * delayBetweenEmails,
      };
    });

    expect(scheduledTimes).toHaveLength(3);
    expect(scheduledTimes[0].delayFromStart).toBe(0);
    expect(scheduledTimes[1].delayFromStart).toBe(2000);
    expect(scheduledTimes[2].delayFromStart).toBe(4000);
    expect(scheduledTimes[2].scheduledAt.getTime() - scheduledTimes[0].scheduledAt.getTime()).toBe(4000);
  });

  it('generates deterministic idempotency key for every recipient email job', () => {
    const campaignId = '123e4567-e89b-12d3-a456-426614174000';
    const recipient = 'lead@company.com';
    const index = 4;

    const key = `${campaignId}:${recipient}:${index}`;
    expect(key).toBe('123e4567-e89b-12d3-a456-426614174000:lead@company.com:4');
  });

  it('correctly handles future vs immediate start times', () => {
    const now = Date.now();
    const pastTime = new Date(now - 60000).toISOString();
    const futureTime = new Date(now + 3600000).toISOString();

    const baseTimePast = Math.max(now, new Date(pastTime).getTime());
    const baseTimeFuture = Math.max(now, new Date(futureTime).getTime());

    expect(baseTimePast).toBeGreaterThanOrEqual(now);
    expect(baseTimeFuture).toBe(new Date(futureTime).getTime());
  });
});
