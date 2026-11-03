import prisma from '../config/database';
import { emailQueue } from '../queue/emailQueue';
import { AppError } from '../utils/errors';
import { elasticsearchService } from './elasticsearch.service';
import logger from '../utils/logger';
import { env } from '../config/env';

export type ScheduleEmailInput = {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
};

function sanitizeEmail<T extends { sender?: any }>(email: T) {
  if (!email.sender) return email;
  const { id, name, email: senderEmail, active } = email.sender;
  return { ...email, sender: { id, name, email: senderEmail, active } };
}

export class EmailService {
  async scheduleEmails(userId: string, input: ScheduleEmailInput) {
    // Make sure the sender belongs to the authenticated user.
    const sender = await prisma.sender.findFirst({
      where: {
        id: input.senderId,
        userId,
      },
    });

    if (!sender) {
      throw new AppError('Sender not found or not owned by user', 404);
    }

    const recipients = [...new Set(input.recipients.map((email) => email.trim().toLowerCase()))];
    if (!recipients.length) throw new AppError('At least one recipient is required', 400);
    if (recipients.length > 10000) throw new AppError('A campaign cannot exceed 10,000 recipients', 400);
    if (!input.subject.trim() || !input.body.trim()) throw new AppError('Subject and email body are required', 400);

    if (input.delayBetweenEmails < 0) {
      throw new AppError('Delay between emails cannot be negative', 400);
    }

    if (input.hourlyLimit <= 0) {
      throw new AppError('Hourly limit must be greater than zero', 400);
    }

    const delayBetweenEmails = Math.max(input.delayBetweenEmails, env.MIN_DELAY_BETWEEN_EMAILS_MS);
    const hourlyLimit = Math.min(input.hourlyLimit, env.MAX_EMAILS_PER_HOUR_PER_SENDER);

    const startTime = new Date(input.startTime);

    if (Number.isNaN(startTime.getTime())) {
      throw new AppError('Invalid start time', 400);
    }

    // Create the campaign and all email records before enqueueing any work.
    const campaign = await prisma.campaign.create({
      data: {
        userId,
        senderId: sender.id,
        subject: input.subject.trim(),
        body: input.body,
        startTime,
        delayBetweenEmails,
        hourlyLimit,
        totalRecipients: recipients.length,
      },
    });

    // Leave a short safety window for the complete batch to be persisted and
    // enqueued before the first immediate-send job becomes eligible to run.
    const baseTime = Math.max(Date.now() + 2000, startTime.getTime());
    const emailRows = recipients.map((recipientEmail, index) => {
      const scheduledAt = new Date(baseTime + index * delayBetweenEmails);
      return {
        campaignId: campaign.id,
        senderId: sender.id,
        recipientEmail,
        subject: campaign.subject,
        body: campaign.body,
        scheduledAt,
        idempotencyKey: `${campaign.id}:${recipientEmail}:${index}`,
        status: 'scheduled',
      };
    });

    try {
      await prisma.email.createMany({ data: emailRows });
      const emails = await prisma.email.findMany({
        where: { campaignId: campaign.id },
        orderBy: { scheduledAt: 'asc' },
      });

      // addBulk sends the batch through BullMQ together, rather than making
      // thousands of independent queue round trips.
      await emailQueue.addBulk(emails.map((email) => ({
        name: 'send-email',
        data: { emailId: email.id, campaignId: campaign.id, senderId: sender.id },
        opts: {
          delay: Math.max(0, email.scheduledAt.getTime() - Date.now()),
          jobId: email.id,
        },
      })));

      for (const email of emails) {
        void elasticsearchService.indexEmail({
          ...email,
          userId,
          senderEmail: sender.email,
        });
      }

      logger.info(`Campaign ${campaign.id} created with ${emails.length} scheduled emails`);
      return { campaign, emailCount: emails.length };
    } catch (error) {
      logger.error(`Failed to enqueue campaign ${campaign.id}; cancelling its pending emails`, error);
      // Compensation: prevent any not-yet-started job from sending. If a job
      // was already accepted by Redis, the worker will see cancelled status.
      await prisma.email.updateMany({
        where: { campaignId: campaign.id, status: 'scheduled' },
        data: { status: 'cancelled', errorMessage: 'Campaign scheduling failed; please create it again.' },
      });
      const persisted = await prisma.email.findMany({ where: { campaignId: campaign.id }, select: { id: true } });
      await Promise.all(persisted.map(async ({ id }) => {
        try {
          const job = await emailQueue.getJob(id);
          if (job) await job.remove();
        } catch (cleanupError) {
          logger.warn(`Could not remove queue job ${id} during campaign rollback`, cleanupError);
        }
      }));
      throw new AppError('Could not schedule this campaign. No pending emails will be sent; please retry.', 503);
    }
  }

  async getScheduledEmails(
    userId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ['scheduled', 'processing'],
          },
        },
        include: {
          sender: true,
          campaign: true,
        },
        skip,
        take: limit,
        orderBy: {
          scheduledAt: 'asc',
        },
      }),

      prisma.email.count({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ['scheduled', 'processing'],
          },
        },
      }),
    ]);

    return { emails: emails.map(sanitizeEmail), total };
  }

  async getSentEmails(
    userId: string,
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ['sent', 'failed'],
          },
        },
        include: {
          sender: true,
          campaign: true,
        },
        skip,
        take: limit,
        orderBy: {
          sentAt: 'desc',
        },
      }),

      prisma.email.count({
        where: {
          campaign: {
            userId,
          },
          status: {
            in: ['sent', 'failed'],
          },
        },
      }),
    ]);

    return { emails: emails.map(sanitizeEmail), total };
  }

  async getEmailById(id: string, userId: string) {
    const email = await prisma.email.findFirst({
      where: {
        id,
        campaign: {
          userId,
        },
      },
      include: {
        campaign: true,
        sender: true,
      },
    });

    if (!email) {
      throw new AppError('Email not found', 404);
    }

    return sanitizeEmail(email);
  }

  async cancelEmail(id: string, userId: string) {
    const email = await this.getEmailById(id, userId);
    if (email.status !== 'scheduled') throw new AppError('Only scheduled emails can be cancelled', 409);

    // Claim cancellation in the database first. The worker atomically claims
    // scheduled -> processing, so only one side can win this race.
    const cancellation = await prisma.email.updateMany({
      where: { id, status: 'scheduled', campaign: { userId } },
      data: { status: 'cancelled' },
    });
    if (cancellation.count === 0) throw new AppError('Email is already processing or cannot be cancelled', 409);

    const queueJobId = email.bullJobId || email.id;
    try {
      const job = await emailQueue.getJob(queueJobId);
      if (job) await job.remove();
    } catch (error) {
      logger.warn(`Could not remove cancelled email job ${queueJobId}; worker will skip the cancelled record.`, error);
    }
    const updated = await prisma.email.findUniqueOrThrow({ where: { id } });

    elasticsearchService
      .indexEmail({
        ...updated,
        userId,
        senderEmail: email.sender.email,
      })
      .catch((error) => {
        logger.warn(
          `Failed to update cancelled email ${id} in Elasticsearch`,
          error,
        );
      });

    return updated;
  }
}

export const emailService = new EmailService();