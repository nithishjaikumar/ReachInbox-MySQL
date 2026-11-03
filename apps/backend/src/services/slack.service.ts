import { WebClient } from '@slack/web-api';
import { env, isSlackOAuthConfigured } from '../config/env';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import logger from '../utils/logger';
import redis from '../config/redis';

export class SlackService {
  getAuthUrl(state: string) {
  if (!isSlackOAuthConfigured) throw new Error('Slack OAuth is not configured');
  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID!,
    scope: 'chat:write,im:write',
    redirect_uri: env.SLACK_REDIRECT_URI!,
    state,
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

  async exchangeCode(code: string) {
    if (!isSlackOAuthConfigured) throw new Error('Slack OAuth is not configured');
    const client = new WebClient();

    const response = await client.oauth.v2.access({
      client_id: env.SLACK_CLIENT_ID!,
      client_secret: env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI!,
    });

    return response;
  }

  async saveConnection(userId: string, result: any) {
    if (!result.ok) {
      throw new Error(result.error || 'Slack OAuth failed');
    }

    if (!result.access_token) {
      throw new Error('Slack did not return a bot access token');
    }

    const encryptedToken = encrypt(result.access_token);

    return prisma.slackConnection.upsert({
      where: { userId },
      create: {
        userId,
        slackUserId: result.authed_user?.id || '',
        accessToken: encryptedToken,
        teamId: result.team?.id || '',
        teamName: result.team?.name || '',
        connected: true,
      },
      update: {
        slackUserId: result.authed_user?.id || '',
        accessToken: encryptedToken,
        teamId: result.team?.id || '',
        teamName: result.team?.name || '',
        connected: true,
      },
    });
  }

  async sendRateLimitNotification(
    userId: string,
    senderEmail: string,
    message: string,
  ) {
    try {
      const connection = await prisma.slackConnection.findUnique({
        where: { userId },
      });

      if (!connection || !connection.connected) return;

      const now = new Date();

      const hourWindow =
        `${now.getUTCFullYear()}-` +
        `${now.getUTCMonth() + 1}-` +
        `${now.getUTCDate()}-` +
        `${now.getUTCHours()}`;

      const idempotencyKey =
        `slack-notif:${userId}:${senderEmail}:${hourWindow}`;

      const setnx = await redis.set(idempotencyKey, '1', 'EX', 3600, 'NX');
      if (setnx !== 'OK') return;

      const token = decrypt(connection.accessToken);
      const client = new WebClient(token);

      let channel = env.SLACK_NOTIFICATION_CHANNEL;
      if (!channel) {
        const conversation = await client.conversations.open({ users: connection.slackUserId });
        channel = conversation.channel?.id;
      }
      if (!channel) return;
      await client.chat.postMessage({ channel, text: message });
    } catch (error) {
      logger.warn('Failed to send Slack notification', error);
    }
  }
}

export const slackService = new SlackService();