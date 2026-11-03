import { z } from 'zod';

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const scheduleEmailSchema = z.object({
  senderId: z.string().uuid('Invalid sender ID'),
  subject: z.string().min(1, 'Subject is required').max(500, 'Subject too long'),
  body: z.string().min(1, 'Body is required'),
  recipients: z
    .array(z.string().email('Invalid email address'))
    .min(1, 'At least one recipient is required')
    .max(10000, 'Too many recipients'),
  startTime: z.string().datetime({ message: 'Invalid start time' }),
  delayBetweenEmails: z
    .number()
    .int()
    .min(0, 'Delay must be non-negative')
    .max(3600000, 'Delay cannot exceed 1 hour')
    .default(2000),
  hourlyLimit: z
    .number()
    .int()
    .min(1, 'Hourly limit must be at least 1')
    .max(10000, 'Hourly limit too high')
    .default(200),
});

export const createSenderSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

export const searchEmailSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['scheduled', 'processing', 'sent', 'failed', 'cancelled']).optional(),
  senderId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
export type CreateSenderInput = z.infer<typeof createSenderSchema>;
export type SearchEmailInput = z.infer<typeof searchEmailSchema>;
