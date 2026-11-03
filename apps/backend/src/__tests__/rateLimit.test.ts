import { describe, it, expect } from 'vitest';
import { getNextAvailableWindow } from '../services/rateLimitWindow';

describe('Rate-limit UTC window calculation', () => {
  it('calculates the next UTC hour boundary', () => {
    const from = new Date('2026-09-04T14:25:30.000Z');
    const nextWindow = getNextAvailableWindow(from);
    expect(nextWindow.toISOString()).toBe('2026-09-04T15:00:00.000Z');
  });

  it('advances to the following hour when called exactly on a boundary', () => {
    const from = new Date('2026-09-04T14:00:00.000Z');
    expect(getNextAvailableWindow(from).toISOString()).toBe('2026-09-04T15:00:00.000Z');
  });
});
