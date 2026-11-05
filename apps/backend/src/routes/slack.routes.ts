import { Router } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import { requireAuth } from '../auth/middleware';
import { slackService } from '../services/slack.service';
import prisma from '../config/database';
import { env, getIsSlackOAuthConfigured } from '../config/env';
import logger from '../utils/logger';

export const slackRouter = Router();

const slackUnavailable = (_req: any, res: any, next: any) => {
  if (!getIsSlackOAuthConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Slack integration is not configured. Set SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, and SLACK_REDIRECT_URI.',
    });
  }
  next();
};

/**
 * Initiates the Slack OAuth v2 connection flow.
 * Generates CSRF state parameter stored in session.
 */
slackRouter.get('/connect', requireAuth, slackUnavailable, (req, res) => {
  const state = randomBytes(32).toString('hex');
  (req.session as any).slackOAuthState = state;
  (req.session as any).slackOAuthUserId = (req.user as any).id;

  req.session.save((error) => {
    if (error) {
      logger.error('Could not save session for Slack OAuth initialization', error);
      return res.status(500).json({ success: false, error: 'Could not initialize Slack connection.' });
    }
    res.redirect(slackService.getAuthUrl(state));
  });
});

/**
 * Slack OAuth v2 callback.
 * Validates CSRF state, exchanges code for bot token, and redirects to frontend.
 */
slackRouter.get('/callback', slackUnavailable, async (req, res, next) => {
  try {
    const { code, state, error: slackError } = req.query;

    if (slackError) {
      logger.warn(`Slack OAuth error received from Slack: ${slackError}`);
      return res.redirect(
        `${env.FRONTEND_URL}/dashboard/settings?error=${encodeURIComponent(String(slackError))}`
      );
    }

    const expected = (req.session as any)?.slackOAuthState as string | undefined;
    const sessionUserId = (req.session as any)?.slackOAuthUserId as string | undefined;

    // Clean up one-time session values
    if (req.session) {
      delete (req.session as any).slackOAuthState;
      delete (req.session as any).slackOAuthUserId;
    }

    if (
      typeof code !== 'string' ||
      typeof state !== 'string' ||
      !expected ||
      !sessionUserId
    ) {
      logger.warn('Slack OAuth callback missing code, state, or session initialization');
      return res.redirect(
        `${env.FRONTEND_URL}/dashboard/settings?error=invalid_slack_state`
      );
    }

    const a = Buffer.from(expected);
    const b = Buffer.from(state);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      logger.warn('Slack OAuth CSRF state mismatch');
      return res.redirect(
        `${env.FRONTEND_URL}/dashboard/settings?error=slack_state_mismatch`
      );
    }

    const result = await slackService.exchangeCode(code);
    await slackService.saveConnection(sessionUserId, result);

    logger.info(`Slack workspace '${result.team?.name}' connected for user ${sessionUserId}`);
    res.redirect(`${env.FRONTEND_URL}/dashboard/settings?slack=connected`);
  } catch (error: any) {
    logger.error('Slack OAuth callback processing failed', error);
    res.redirect(
      `${env.FRONTEND_URL}/dashboard/settings?error=${encodeURIComponent(error.message || 'slack_auth_failed')}`
    );
  }
});

/**
 * Disconnects the user's connected Slack workspace.
 */
slackRouter.post('/disconnect', requireAuth, async (req, res, next) => {
  try {
    await slackService.disconnect((req.user as any).id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

/**
 * Returns connection and configuration status for the frontend settings page.
 */
slackRouter.get('/status', requireAuth, async (req, res, next) => {
  try {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId: (req.user as any).id },
    });

    res.json({
      connected: Boolean(connection?.connected),
      teamName: connection?.connected ? connection?.teamName : null,
      configured: getIsSlackOAuthConfigured(),
    });
  } catch (error) {
    next(error);
  }
});
