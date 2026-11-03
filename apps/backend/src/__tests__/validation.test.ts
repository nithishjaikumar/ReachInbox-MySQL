import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const scheduleEmailSchema = z.object({
  senderId: z.string().uuid('Invalid sender ID'),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
  body: z.string().min(1, 'Body is required'),
  recipients: z
    .array(z.string().email('Invalid email address'))
    .min(1, 'At least one recipient is required')
    .max(10000, 'Too many recipients'),
  startTime: z.string().datetime({ message: 'Invalid start time' }),
  delayBetweenEmails: z.number().int().min(0).default(2000),
  hourlyLimit: z.number().int().min(1).default(200),
});

describe('Schedule Input Validation Schema', () => {
  it('validates a correct scheduling payload', () => {
    const validPayload = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      subject: 'Quarterly Update',
      body: '<p>Hello team, here is the update.</p>',
      recipients: ['alice@domain.com', 'bob@domain.com'],
      startTime: new Date().toISOString(),
      delayBetweenEmails: 2000,
      hourlyLimit: 150,
    };

    const result = scheduleEmailSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email addresses in recipient list', () => {
    const invalidPayload = {
      senderId: '123e4567-e89b-12d3-a456-426614174000',
      subject: 'Invalid Email Test',
      body: 'Testing',
      recipients: ['valid@domain.com', 'not-an-email'],
      startTime: new Date().toISOString(),
    };

    const result = scheduleEmailSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('rejects non-uuid sender IDs', () => {
    const invalidPayload = {
      senderId: '123-not-a-uuid',
      subject: 'Subject',
      body: 'Body',
      recipients: ['test@example.com'],
      startTime: new Date().toISOString(),
    };

    const result = scheduleEmailSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});
