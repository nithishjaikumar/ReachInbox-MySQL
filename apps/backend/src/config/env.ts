import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  // Elasticsearch is an optional search accelerator. MySQL search is used when unset.
  ELASTICSEARCH_URL: z.string().url().optional().or(z.literal('')),
  ELASTICSEARCH_API_KEY: z.string().optional(),

  // OAuth integrations are optional at startup and report a clear 503 until configured.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional().or(z.literal('')),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().url().optional().or(z.literal('')),

  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().int().positive().default(587),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASSWORD: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/, 'ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  MIN_DELAY_BETWEEN_EMAILS_MS: z.coerce.number().int().min(0).default(2000),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.coerce.number().int().positive().default(200),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),
  SLACK_NOTIFICATION_CHANNEL: z.string().optional(),
  BULL_BOARD_USERNAME: z.string().optional(),
  BULL_BOARD_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isGoogleOAuthConfigured = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL);

export const getIsSlackOAuthConfigured = () => {
  const clientId = process.env.SLACK_CLIENT_ID || env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET || env.SLACK_CLIENT_SECRET;
  const redirectUri = process.env.SLACK_REDIRECT_URI || env.SLACK_REDIRECT_URI;
  return Boolean(clientId && clientSecret && redirectUri);
};

export const getSlackCredentials = () => {
  return {
    clientId: process.env.SLACK_CLIENT_ID || env.SLACK_CLIENT_ID,
    clientSecret: process.env.SLACK_CLIENT_SECRET || env.SLACK_CLIENT_SECRET,
    redirectUri: process.env.SLACK_REDIRECT_URI || env.SLACK_REDIRECT_URI,
    channel: process.env.SLACK_NOTIFICATION_CHANNEL || env.SLACK_NOTIFICATION_CHANNEL,
  };
};

export const isSlackOAuthConfigured = Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET && env.SLACK_REDIRECT_URI);
export const isElasticsearchConfigured = Boolean(env.ELASTICSEARCH_URL);
