import { DelayedError, Job, Worker } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { env } from '../config/env';
import prisma from '../config/database';

import { rateLimitService } from '../services/rateLimit.service';
import { slackService } from '../services/slack.service';
import { elasticsearchService } from '../services/elasticsearch.service';

import {
  createEtherealTransport,
  sendEmail,
} from '../integrations/email/ethereal';

import { sendResendEmail } from '../integrations/email/resend';

import logger from '../utils/logger';
import { decrypt, isEncryptedPayload } from '../utils/encryption';
import { shouldRetryJob } from './retryPolicy';

type EmailJobData = {
  emailId: string;
  campaignId: string;
  senderId: string;
};

export const emailWorker = new Worker<EmailJobData>(
  'email-queue',

  async (job: Job<EmailJobData>) => {
    const { emailId, senderId } = job.data;

    logger.info(
      `Processing email job ${job.id} for email ${emailId}`,
    );

    /*
     * ------------------------------------------------------------
     * 1. Load email from database
     * ------------------------------------------------------------
     */

    const email = await prisma.email.findUnique({
      where: {
        id: emailId,
      },
      include: {
        sender: true,
        campaign: true,
      },
    });

    if (!email) {
      logger.warn(
        `Email ${emailId} was not found. Skipping job ${job.id}.`,
      );

      return;
    }

    /*
     * ------------------------------------------------------------
     * 2. Idempotency protection
     * ------------------------------------------------------------
     */

    if (email.status === 'sent') {
      logger.info(
        `Email ${emailId} has already been sent. Skipping duplicate job.`,
      );

      return;
    }

    /*
     * Cancelled emails must never be sent.
     */

    if (email.status === 'cancelled') {
      logger.info(
        `Email ${emailId} is cancelled. Skipping job.`,
      );

      return;
    }

    /*
     * ------------------------------------------------------------
     * 3. Atomically claim the email
     * ------------------------------------------------------------
     */

    const claimResult = await prisma.email.updateMany({
      where: {
        id: emailId,
        status: 'scheduled',
      },
      data: {
        status: 'processing',
      },
    });

    if (claimResult.count === 0) {
      logger.info(
        `Email ${emailId} was already claimed by another worker.`,
      );

      return;
    }

    /*
     * ------------------------------------------------------------
     * 4. Distributed hourly rate-limit check
     * ------------------------------------------------------------
     */

    let rateLimitResult: {
      allowed: boolean;
      resetAt?: Date;
    };

    try {
      rateLimitResult =
        await rateLimitService.checkAndIncrementRate(
          senderId,
          email.campaign.hourlyLimit,
        );
    } catch (error) {
      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: 'scheduled',
        },
      });

      logger.error(
        `Rate limit check failed for email ${emailId}`,
        error,
      );

      throw error;
    }

    /*
     * ------------------------------------------------------------
     * 5. Rate limit reached
     * ------------------------------------------------------------
     */

    if (!rateLimitResult.allowed) {
      const nextWindow =
        rateLimitService.getNextAvailableWindow();

      logger.warn(
        `Hourly rate limit reached for sender ${senderId}. ` +
          `Rescheduling email ${emailId} to ${nextWindow.toISOString()}.`,
      );

      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: 'scheduled',
          scheduledAt: nextWindow,
        },
      });

      await job.moveToDelayed(
        nextWindow.getTime(),
        job.token!,
      );

      try {
        await slackService.sendRateLimitNotification(
          email.campaign.userId,
          email.sender.email,
          `Rate limit reached for ${email.sender.email}. ` +
            `Email ${emailId} has been rescheduled to ${nextWindow.toISOString()}.`,
        );

        logger.info(
          `Slack rate-limit notification sent for sender ${email.sender.email}.`,
        );
      } catch (slackError) {
        logger.error(
          `Failed to send Slack rate-limit notification for sender ${email.sender.email}`,
          slackError,
        );
      }

      throw new DelayedError();
    }

    /*
     * ------------------------------------------------------------
     * 6. Create Ethereal SMTP transport
     * ------------------------------------------------------------
     */

    let transportConfig:
      | {
          user: string;
          pass: string;
          host: string;
          port: number;
        }
      | undefined;

    if (email.sender.etherealUser && email.sender.etherealPass && email.sender.etherealHost && email.sender.etherealPort) {
      const decryptIfEncrypted = (value: string) => isEncryptedPayload(value) ? decrypt(value) : value;
      transportConfig = {
        user: decryptIfEncrypted(email.sender.etherealUser),
        pass: decryptIfEncrypted(email.sender.etherealPass),
        host: email.sender.etherealHost,
        port: email.sender.etherealPort,
      };
    }

    try {
      const from = `"${email.sender.name}" <${email.sender.email}>`;

      /*
       * Delivery priority:
       *  1. Sender-specific Ethereal SMTP credentials (best for safe demo/test delivery).
       *  2. Resend API (fallback for production / senders without Ethereal creds).
       *  3. Global Ethereal env fallback (legacy).
       */
      const result = transportConfig
        ? await sendEmail(createEtherealTransport(transportConfig), {
            from,
            to: email.recipientEmail,
            subject: email.subject,
            html: email.body,
          })
        : env.RESEND_API_KEY
        ? await sendResendEmail({
            from,
            to: email.recipientEmail,
            subject: email.subject,
            html: email.body,
          })
        : await sendEmail(createEtherealTransport(), {
            from,
            to: email.recipientEmail,
            subject: email.subject,
            html: email.body,
          });

      logger.info(
        `Email provider accepted email ${emailId} for ${email.recipientEmail}`
      );

      /*
       * ----------------------------------------------------------
       * 8. Atomically mark email as SENT
       * ----------------------------------------------------------
       */

      const sentResult = await prisma.email.updateMany({
        where: {
          id: emailId,
          status: 'processing',
        },
        data: {
          status: 'sent',
          sentAt: new Date(),
          etherealPreviewUrl: result.previewUrl ?? null,
          attempts: {
            increment: 1,
          },
        },
      });

      if (sentResult.count === 0) {
        logger.warn(
          `Email ${emailId} was not in processing state when marking as sent.`,
        );
      }

      /*
       * ----------------------------------------------------------
       * 9. Index in Elasticsearch
       * ----------------------------------------------------------
       */

      try {
        const updatedEmail =
          await prisma.email.findUnique({
            where: {
              id: emailId,
            },
          });

        if (updatedEmail) {
          await elasticsearchService.indexEmail({
            ...updatedEmail,
            userId: email.campaign.userId,
            senderEmail: email.sender.email,
          });
        }
      } catch (elasticError) {
        logger.error(
          `Failed to index sent email ${emailId} in Elasticsearch`,
          elasticError,
        );
      }

      /*
       * ----------------------------------------------------------
       * 10. Successful completion
       * ----------------------------------------------------------
       */

      logger.info(
        `Email ${emailId} sent successfully to ${email.recipientEmail}`,
      );
    } catch (error) {
      /*
       * ----------------------------------------------------------
       * 11. SMTP / processing failure
       * ----------------------------------------------------------
       */

      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown email sending error';

      logger.error(
        `Failed to send email ${emailId}: ${errorMessage}`,
        error,
      );

      const maxAttempts = Number(job.opts.attempts || 1);
      const willRetry = shouldRetryJob(job.attemptsMade, maxAttempts);
      await prisma.email.updateMany({
        where: { id: emailId, status: 'processing' },
        data: {
          // BullMQ will retry this job after backoff. The next attempt must be
          // able to claim the record, so keep it scheduled until the final failure.
          status: willRetry ? 'scheduled' : 'failed',
          errorMessage,
          attempts: { increment: 1 },
        },
      });

      /*
       * Best-effort Elasticsearch update.
       */

      try {
        const failedEmail =
          await prisma.email.findUnique({
            where: {
              id: emailId,
            },
          });

        if (failedEmail) {
          await elasticsearchService.indexEmail({
            ...failedEmail,
            userId: email.campaign.userId,
            senderEmail: email.sender.email,
          });
        }
      } catch (elasticError) {
        logger.error(
          `Failed to index failed email ${emailId} in Elasticsearch`,
          elasticError,
        );
      }

      /*
       * Let BullMQ handle retry/backoff.
       */

      throw error;
    }
  },

  {
    connection: getRedisConnection(),

    /*
     * Configurable worker concurrency.
     */
    concurrency: env.WORKER_CONCURRENCY,

    /*
     * Give BullMQ enough time to maintain the
     * Redis lock while SMTP/database operations run.
     */
    lockDuration: 60000,
  },
);

/*
 * ------------------------------------------------------------
 * Worker lifecycle events
 * ------------------------------------------------------------
 */

emailWorker.on('ready', () => {
  logger.info('Email worker is ready');
});

emailWorker.on('error', (error) => {
  logger.error('Email worker error', error);
});

emailWorker.on('failed', (job, error) => {
  logger.error(
    `BullMQ job ${job?.id ?? 'unknown'} failed`,
    error,
  );
});

emailWorker.on('completed', (job) => {
  logger.info(
    `BullMQ job ${job.id} completed`,
  );
});