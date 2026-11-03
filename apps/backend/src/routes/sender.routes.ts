import { Router } from 'express';
import { requireAuth } from '../auth/middleware';
import { senderService } from '../services/sender.service';
import { validate } from '../middleware/validate';
import { z } from 'zod';

export const senderRouter = Router();

senderRouter.use(requireAuth);

senderRouter.get('/', async (req, res, next) => {
  try {
    const senders = await senderService.getSenders((req.user as any).id);
    res.json({ success: true, data: senders });
  } catch (error) {
    next(error);
  }
});

const createSenderSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    useEthereal: z.boolean().optional(),
  }),
});

senderRouter.post('/', validate(createSenderSchema), async (req, res, next) => {
  try {
    const sender = await senderService.createSender((req.user as any).id, req.body);
    res.json({ success: true, sender });
  } catch (error) {
    next(error);
  }
});
