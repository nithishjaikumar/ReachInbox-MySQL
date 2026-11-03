import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { emailService } from '../services/email.service';
import { elasticsearchService } from '../services/elasticsearch.service';
import { validate } from '../middleware/validate';
import { z } from 'zod';

export const emailRouter = Router();

emailRouter.use(requireAuth);

const scheduleEmailSchema = z.object({
  body: z.object({
    senderId: z.string().uuid(),
    recipients: z.array(z.string().email()).min(1, 'At least one recipient required').max(10000, 'Too many recipients'),
    subject: z.string().trim().min(1, 'Subject is required').max(500, 'Subject is too long'),
    body: z.string().min(1, 'Body is required'),
    startTime: z.string().datetime(),
    delayBetweenEmails: z.number().int().min(0).default(2000),
    hourlyLimit: z.number().int().min(1).max(10000).default(200),
  }),
});

emailRouter.post('/schedule', validate(scheduleEmailSchema), async (req, res, next) => {
  try {
    const result = await emailService.scheduleEmails((req.user as any).id, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

emailRouter.get('/scheduled', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { emails, total } = await emailService.getScheduledEmails((req.user as any).id, page, limit);
    res.json({ success: true, data: emails, total, page, limit });
  } catch (error) {
    next(error);
  }
});

emailRouter.get('/sent', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const { emails, total } = await emailService.getSentEmails((req.user as any).id, page, limit);
    res.json({ success: true, data: emails, total, page, limit });
  } catch (error) {
    next(error);
  }
});

emailRouter.get('/search', async (req, res, next) => {
  try {
    const query = req.query.q as string;
    const status = req.query.status as string;
    if (!query && !status) return res.json({ success: true, data: [], total: 0 });
    const results = await elasticsearchService.searchEmails(query || '', (req.user as any).id, status);
    res.json({ success: true, data: results, total: results.length });
  } catch (error) {
    next(error);
  }
});

emailRouter.get('/:id', async (req, res, next) => {
  try {
    const email = await emailService.getEmailById(req.params.id, (req.user as any).id);
    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
});

emailRouter.post('/:id/cancel', async (req, res, next) => {
  try {
    const email = await emailService.cancelEmail(req.params.id, (req.user as any).id);
    res.json({ success: true, data: email });
  } catch (error) {
    next(error);
  }
});
