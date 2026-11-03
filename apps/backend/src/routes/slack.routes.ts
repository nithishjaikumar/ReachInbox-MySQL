import { Router } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { requireAuth } from '../auth/middleware';
import { slackService } from '../services/slack.service';
import prisma from '../config/database';
import { env, isSlackOAuthConfigured } from '../config/env';

export const slackRouter = Router();
const slackUnavailable = (_req: any, res: any, next: any) => {
  if (!isSlackOAuthConfigured) return res.status(503).json({ success: false, error: 'Slack integration is not configured.' });
  next();
};

slackRouter.get('/connect', requireAuth, slackUnavailable, (req, res) => {
  const state = randomBytes(32).toString('hex');
  (req.session as any).slackOAuthState = state;
  (req.session as any).slackOAuthUserId = (req.user as any).id;
  req.session.save((error) => {
    if (error) return res.status(500).json({ success: false, error: 'Could not initialize Slack connection.' });
    res.redirect(slackService.getAuthUrl(state));
  });
});

slackRouter.get('/callback', requireAuth, slackUnavailable, async (req, res, next) => {
  try {
    const { code, state } = req.query;
    const expected = (req.session as any).slackOAuthState as string | undefined;
    const sessionUserId = (req.session as any).slackOAuthUserId as string | undefined;
    delete (req.session as any).slackOAuthState;
    delete (req.session as any).slackOAuthUserId;
    if (typeof code !== 'string' || typeof state !== 'string' || !expected || !sessionUserId || sessionUserId !== (req.user as any).id) {
      return res.status(400).send('Invalid Slack OAuth state. Please try connecting again.');
    }
    const a = Buffer.from(expected); const b = Buffer.from(state);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return res.status(400).send('Invalid Slack OAuth state.');
    const result = await slackService.exchangeCode(code);
    await slackService.saveConnection(sessionUserId, result);
    res.redirect(`${env.FRONTEND_URL}/dashboard/settings?slack=connected`);
  } catch (error) { next(error); }
});

slackRouter.post('/disconnect', requireAuth, async (req, res, next) => {
  try {
    await prisma.slackConnection.updateMany({ where: { userId: (req.user as any).id }, data: { connected: false } });
    res.json({ success: true });
  } catch (error) { next(error); }
});

slackRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    const connection = await prisma.slackConnection.findUnique({ where: { userId: (req.user as any).id } });
    res.json({ connected: connection?.connected || false, teamName: connection?.teamName || null });
  } catch (error) { next(error); }
});
