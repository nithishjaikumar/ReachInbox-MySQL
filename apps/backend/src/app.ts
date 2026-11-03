import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { sessionMiddleware } from './config/session';
import { errorHandler } from './middleware/errorHandler';
import { emailQueue } from './queue/emailQueue';

import './auth/google';

import { authRouter } from './routes/auth.routes';
import { emailRouter } from './routes/email.routes';
import { campaignRouter } from './routes/campaign.routes';
import { senderRouter } from './routes/sender.routes';
import { slackRouter } from './routes/slack.routes';
import { healthRouter } from './routes/health.routes';

const app = express();

app.set('trust proxy', 1);

/**
 * Security middleware
 */
app.use(helmet());

/**
 * CORS
 */
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

// Reject cross-origin state-changing requests. CORS alone is not a CSRF control.
app.use((req, res, next) => {
  const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const origin = req.get('origin');
  if (stateChanging && origin && origin !== env.FRONTEND_URL) {
    return res.status(403).json({ success: false, error: 'Cross-origin request rejected.' });
  }
  next();
});

/**
 * Body parsing
 */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/**
 * Cookies + session
 */
app.use(cookieParser());
app.use(sessionMiddleware);

/**
 * Passport authentication
 */
app.use(passport.initialize());
app.use(passport.session());

/**
 * API routes
 */
app.use('/api/auth', authRouter);
app.use('/api/emails', emailRouter);
app.use('/api/campaigns', campaignRouter);
app.use('/api/senders', senderRouter);
app.use('/api/slack', slackRouter);
app.use('/api/health', healthRouter);

/**
 * Bull Board
 *
 * Bull Board's installed type definitions can conflict with
 * the BullMQ version used by the application.
 * The runtime adapter is valid, so we intentionally cast it
 * here to satisfy the TypeScript type mismatch.
 */
const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue) as any],
  serverAdapter,
});

if (env.BULL_BOARD_USERNAME && env.BULL_BOARD_PASSWORD) {
  app.use('/admin/queues', (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm=\"ReachInbox Queue Dashboard\"');
      return res.status(401).send('Authentication required');
    }
    const [username, password] = Buffer.from(header.slice(6), 'base64').toString('utf8').split(':');
    if (username !== env.BULL_BOARD_USERNAME || password !== env.BULL_BOARD_PASSWORD) return res.status(401).send('Invalid credentials');
    next();
  }, serverAdapter.getRouter());
}


/**
 * Global error handler
 *
 * This must be registered after all routes and middleware.
 */
app.use(errorHandler);

export default app;