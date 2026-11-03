export enum EmailStatus {
  SCHEDULED = 'scheduled',
  PROCESSING = 'processing',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export const QUEUE_NAMES = {
  EMAIL: 'email-queue',
} as const;

export const DEFAULT_WORKER_CONCURRENCY = 5;
export const DEFAULT_MIN_DELAY_MS = 2000;
export const DEFAULT_MAX_EMAILS_PER_HOUR = 200;

export const API_ROUTES = {
  AUTH: {
    GOOGLE: '/api/auth/google',
    GOOGLE_CALLBACK: '/api/auth/google/callback',
    LOGOUT: '/api/auth/logout',
    ME: '/api/auth/me',
  },
  EMAILS: {
    SCHEDULE: '/api/emails/schedule',
    SCHEDULED: '/api/emails/scheduled',
    SENT: '/api/emails/sent',
    SEARCH: '/api/emails/search',
    BY_ID: '/api/emails/:id',
    CANCEL: '/api/emails/:id/cancel',
  },
  CAMPAIGNS: {
    BASE: '/api/campaigns',
    BY_ID: '/api/campaigns/:id',
  },
  SENDERS: {
    BASE: '/api/senders',
    BY_ID: '/api/senders/:id',
  },
  SLACK: {
    CONNECT: '/api/slack/connect',
    CALLBACK: '/api/slack/callback',
    DISCONNECT: '/api/slack/disconnect',
    STATUS: '/api/slack/status',
  },
  HEALTH: '/api/health',
} as const;
