import { WebClient } from '@slack/web-api';
import { env, getIsSlackOAuthConfigured, getSlackCredentials } from '../config/env';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import logger from '../utils/logger';
import redis from '../config/redis';

export class SlackService {
  /**
   * Generates the Slack OAuth v2 authorize URL with requested bot scopes and CSRF state.
   */
  getAuthUrl(state: string): string {
    if (!getIsSlackOAuthConfigured()) {
      throw new Error('Slack OAuth is not configured. Missing client ID, secret, or redirect URI.');
    }

    const { clientId, redirectUri } = getSlackCredentials();
    const params = new URLSearchParams({
      client_id: clientId!,
      scope: 'chat:write,im:write',
      redirect_uri: redirectUri!,
      state,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for bot access token via Slack OAuth v2 API.
   */
  async exchangeCode(code: string) {
    if (!getIsSlackOAuthConfigured()) {
      throw new Error('Slack OAuth is not configured. Missing client ID, secret, or redirect URI.');
    }

    const { clientId, clientSecret, redirectUri } = getSlackCredentials();
    const client = new WebClient();

    const response = await client.oauth.v2.access({
      client_id: clientId!,
      client_secret: clientSecret!,
      code,
      redirect_uri: redirectUri!,
    });

    return response;
  }

  /**
   * Securely saves or updates the Slack connection in MySQL.
   * Bot token is encrypted using AES-256-GCM before storage.
   */
  async saveConnection(userId: string, result: any) {
    if (!result.ok) {
      throw new Error(result.error || 'Slack OAuth exchange failed');
    }

    if (!result.access_token) {
      throw new Error('Slack did not return a bot access token');
    }

    const encryptedToken = encrypt(result.access_token);
    const slackUserId = result.authed_user?.id || '';
    const teamId = result.team?.id || '';
    const teamName = result.team?.name || 'Slack Workspace';

    return prisma.slackConnection.upsert({
      where: { userId },
      create: {
        userId,
        slackUserId,
        accessToken: encryptedToken,
        teamId,
        teamName,
        channelId: result.incoming_webhook?.channel_id || null,
        connected: true,
      },
      update: {
        slackUserId,
        accessToken: encryptedToken,
        teamId,
        teamName,
        channelId: result.incoming_webhook?.channel_id || null,
        connected: true,
      },
    });
  }

  /**
   * Disconnects the user's Slack workspace integration.
   */
  async disconnect(userId: string) {
    return prisma.slackConnection.updateMany({
      where: { userId },
      data: { connected: false },
    });
  }

  /**
   * Sends an hourly rate-limit notification to the user's Slack workspace.
   * Employs Redis atomic SETNX deduplication to guarantee at most 1 notification
   * per sender per UTC hour window across all distributed workers.
   */
  async sendRateLimitNotification(
    userId: string,
    senderEmail: string,
    message: string,
  ): Promise<boolean> {
    try {
      const connection = await prisma.slackConnection.findUnique({
        where: { userId },
      });

      if (!connection || !connection.connected) {
        return false;
      }

      // 1. Hourly window deduplication key
      const now = new Date();
      const hourWindow = `${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`;
      const idempotencyKey = `slack-notif:${userId}:${senderEmail}:${hourWindow}`;

      // 2. Atomic claim via Redis SETNX with 1-hour TTL
      const setnx = await redis.set(idempotencyKey, '1', 'EX', 3600, 'NX');
      if (setnx !== 'OK') {
        logger.info(`Slack rate-limit notification for ${senderEmail} already sent for window ${hourWindow}`);
        return false;
      }

      // 3. Decrypt token and initialize Slack WebClient
      const token = decrypt(connection.accessToken);
      const client = new WebClient(token);

      // 4. Resolve delivery destination: configured channel OR Direct Message with authed user
      const { channel: configuredChannel } = getSlackCredentials();
      let targetChannel = configuredChannel || connection.channelId || undefined;

      if (!targetChannel) {
        if (!connection.slackUserId) {
          logger.warn(`No Slack channel or authed user ID available for user ${userId}`);
          return false;
        }
        const conversation = await client.conversations.open({
          users: connection.slackUserId,
        });
        targetChannel = conversation.channel?.id;
      }

      if (!targetChannel) {
        logger.warn(`Could not open Slack DM channel for user ${userId}`);
        return false;
      }

      // 5. Post notification message
      await client.chat.postMessage({
        channel: targetChannel,
        text: message,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ ReachInbox Rate Limit Alert',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message,
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Sender: \`${senderEmail}\` | Time: <!date^${Math.floor(now.getTime() / 1000)}^{date_num} {time_secs}|${now.toISOString()}>`,
              },
            ],
          },
        ],
      });

      logger.info(`Slack notification delivered to channel ${targetChannel} for sender ${senderEmail}`);
      return true;
    } catch (error) {
      logger.warn('Failed to send Slack rate-limit notification', error);
      return false;
    }
  }
}

export const slackService = new SlackService();
