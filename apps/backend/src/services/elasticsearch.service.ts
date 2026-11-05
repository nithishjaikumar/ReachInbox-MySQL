import { elasticClient } from '../config/elasticsearch';
import prisma from '../config/database';
import logger from '../utils/logger';

export class ElasticsearchService {
  private readonly index = 'emails';

  /**
   * Ensures the 'emails' index and its schema mappings exist in Elasticsearch.
   * Idempotent: creates index if missing, updates mappings if fields were added.
   */
  async ensureIndex(): Promise<void> {
    if (!elasticClient) return;

    const properties = {
      id: { type: 'keyword' },
      recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      senderEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      subject: { type: 'text' },
      body: { type: 'text' },
      status: { type: 'keyword' },
      scheduledAt: { type: 'date' },
      sentAt: { type: 'date' },
      campaignId: { type: 'keyword' },
      userId: { type: 'keyword' },
      senderId: { type: 'keyword' },
      errorMessage: { type: 'text' },
      attempts: { type: 'integer' },
    };

    try {
      const exists = await elasticClient.indices.exists({ index: this.index });
      if (!exists) {
        await elasticClient.indices.create({
          index: this.index,
          mappings: { properties },
        });
        logger.info(`Elasticsearch index "${this.index}" created`);
      } else {
        await elasticClient.indices.putMapping({
          index: this.index,
          properties: {
            errorMessage: { type: 'text' },
            attempts: { type: 'integer' },
          },
        });
      }
    } catch (error) {
      logger.warn('Elasticsearch unavailable; database search will be used.', error);
    }
  }

  /**
   * Indexes or updates an email record with automatic retry and backoff.
   */
  async indexEmail(email: any, maxRetries = 3): Promise<void> {
    if (!elasticClient) return;

    let userId = email.userId || email.campaign?.userId;
    let senderEmail = email.senderEmail || email.sender?.email;

    if (!userId && email.campaignId) {
      const campaign = await prisma.campaign.findUnique({
        where: { id: email.campaignId },
        select: { userId: true },
      });
      userId = campaign?.userId;
    }

    if (!senderEmail && email.senderId) {
      const sender = await prisma.sender.findUnique({
        where: { id: email.senderId },
        select: { email: true },
      });
      senderEmail = sender?.email || '';
    }

    const document = {
      id: email.id,
      recipientEmail: email.recipientEmail,
      senderEmail: senderEmail || '',
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledAt: email.scheduledAt,
      sentAt: email.sentAt || null,
      campaignId: email.campaignId,
      userId: userId || '',
      senderId: email.senderId,
      errorMessage: email.errorMessage || null,
      attempts: Number(email.attempts || 0),
    };

    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        await elasticClient.index({
          index: this.index,
          id: email.id,
          document,
        });
        return;
      } catch (error: any) {
        attempt++;
        if (attempt >= maxRetries) {
          logger.warn(
            `Failed to index email ${email.id} in Elasticsearch after ${maxRetries} attempts`,
            error?.message || error
          );
          return;
        }
        await new Promise((r) => setTimeout(r, attempt * 300));
      }
    }
  }

  /**
   * Reconciles all MySQL email records for a user into Elasticsearch.
   * Can be run on demand or during startup reconciliation.
   */
  async reconcileEmails(userId?: string): Promise<{ reconciled: number; failed: number }> {
    if (!elasticClient) {
      return { reconciled: 0, failed: 0 };
    }

    await this.ensureIndex();

    const emails = await prisma.email.findMany({
      where: userId ? { campaign: { userId } } : {},
      include: {
        campaign: { select: { userId: true } },
        sender: { select: { email: true } },
      },
    });

    if (!emails.length) {
      return { reconciled: 0, failed: 0 };
    }

    const operations = emails.flatMap((email) => [
      { index: { _index: this.index, _id: email.id } },
      {
        id: email.id,
        recipientEmail: email.recipientEmail,
        senderEmail: email.sender?.email || '',
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt,
        sentAt: email.sentAt || null,
        campaignId: email.campaignId,
        userId: email.campaign?.userId || '',
        senderId: email.senderId,
        errorMessage: email.errorMessage || null,
        attempts: Number(email.attempts || 0),
      },
    ]);

    try {
      const bulkResponse = await elasticClient.bulk({ refresh: true, operations });
      if (bulkResponse.errors) {
        const errorCount = bulkResponse.items.filter((item: any) => item.index?.error).length;
        logger.warn(`Elasticsearch reconciliation had ${errorCount} item errors`);
        return { reconciled: emails.length - errorCount, failed: errorCount };
      }
      logger.info(`Elasticsearch reconciliation synchronized ${emails.length} emails`);
      return { reconciled: emails.length, failed: 0 };
    } catch (error) {
      logger.error('Elasticsearch reconciliation bulk operation failed', error);
      return { reconciled: 0, failed: emails.length };
    }
  }

  /**
   * Performs real search queries against Elasticsearch.
   * Strictly uses Elasticsearch when configured and healthy.
   * Only falls back to MySQL if Elasticsearch encounters an infrastructure error.
   */
  async searchEmails(query: string, userId: string, status?: string) {
    if (elasticClient) {
      try {
        const must: any[] = [{ term: { userId } }];

        if (query?.trim()) {
          must.push({
            multi_match: {
              query: query.trim(),
              fields: ['subject^2', 'recipientEmail^2', 'senderEmail', 'body', 'errorMessage'],
              type: 'best_fields',
              fuzziness: 'AUTO',
            },
          });
        }

        if (status?.trim()) {
          must.push({ term: { status: status.trim() } });
        }

        const result = await elasticClient.search({
          index: this.index,
          query: { bool: { must } },
          size: 50,
          sort: [{ scheduledAt: { order: 'desc' } }],
        });

        const ids = result.hits.hits.map((hit: any) => hit._id).filter(Boolean) as string[];

        // If Elasticsearch matched 0 items, return empty list (do NOT fall back to MySQL)
        if (ids.length === 0) {
          return [];
        }

        // Fetch the corresponding relational records while preserving Elasticsearch order
        const records = await prisma.email.findMany({
          where: {
            id: { in: ids },
            campaign: { userId },
          },
          include: {
            sender: { select: { id: true, name: true, email: true, active: true } },
            campaign: true,
          },
        });

        const byId = new Map(records.map((record) => [record.id, record]));
        return ids.map((id) => byId.get(id)).filter(Boolean);
      } catch (error) {
        logger.warn('Elasticsearch search request failed; falling back to MySQL.', error);
      }
    }

    // Fallback path: only executed when Elasticsearch is unconfigured or unavailable
    return prisma.email.findMany({
      where: {
        campaign: { userId },
        ...(status ? { status } : {}),
        ...(query
          ? {
              OR: [
                { subject: { contains: query } },
                { recipientEmail: { contains: query } },
                { body: { contains: query } },
                { sender: { email: { contains: query } } },
              ],
            }
          : {}),
      },
      include: {
        sender: { select: { id: true, name: true, email: true, active: true } },
        campaign: true,
      },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
  }
}

export const elasticsearchService = new ElasticsearchService();
