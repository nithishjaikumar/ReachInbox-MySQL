import { describe, expect, it } from 'vitest';
import { shouldRetryJob } from '../queue/retryPolicy';

describe('BullMQ retry state policy', () => {
  it('returns the record to scheduled while attempts remain', () => {
    expect(shouldRetryJob(0, 3)).toBe(true);
    expect(shouldRetryJob(1, 3)).toBe(true);
  });
  it('marks the record terminal after the final attempt', () => {
    expect(shouldRetryJob(2, 3)).toBe(false);
    expect(shouldRetryJob(0, 1)).toBe(false);
  });
});
