import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../auth/middleware';
import prisma from '../config/database';
import { emailService } from '../services/email.service';
import { validate } from '../middleware/validate';

export const campaignRouter = Router();
campaignRouter.use(requireAuth);

const createCampaignSchema = z.object({ body: z.object({
  senderId: z.string().uuid(),
  recipients: z.array(z.string().email()).min(1).max(10000),
  subject: z.string().trim().min(1).max(500),
  body: z.string().min(1),
  startTime: z.string().datetime(),
  delayBetweenEmails: z.number().int().min(0).default(2000),
  hourlyLimit: z.number().int().min(1).max(10000).default(200),
}) });

campaignRouter.post('/', validate(createCampaignSchema), async (req, res, next) => {
  try {
    const result = await emailService.scheduleEmails((req.user as any).id, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) { next(error); }
});

campaignRouter.get('/', async (req, res, next) => {
  try {
    const campaigns = await prisma.campaign.findMany({ where: { userId: (req.user as any).id }, include: { sender: { select: { id: true, name: true, email: true, active: true } } }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: campaigns });
  } catch (error) { next(error); }
});

campaignRouter.get('/:id', async (req, res, next) => {
  try {
    const campaign = await prisma.campaign.findFirst({ where: { id: req.params.id, userId: (req.user as any).id }, include: { emails: true, sender: true } });
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.json({ success: true, data: campaign });
  } catch (error) { next(error); }
});
