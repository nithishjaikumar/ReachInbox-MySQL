import { elasticClient } from '../config/elasticsearch';
import prisma from '../config/database';
import logger from '../utils/logger';

export class ElasticsearchService {
  private index = 'emails';

  async ensureIndex() {
    if (!elasticClient) return;
    try {
      const exists = await elasticClient.indices.exists({ index: this.index });
      if (!exists) {
        await elasticClient.indices.create({
          index: this.index,
          mappings: { properties: {
            id: { type: 'keyword' },
            recipientEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            senderEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' }, body: { type: 'text' }, status: { type: 'keyword' },
            scheduledAt: { type: 'date' }, sentAt: { type: 'date' }, campaignId: { type: 'keyword' },
            userId: { type: 'keyword' }, senderId: { type: 'keyword' },
          } },
        });
        logger.info(`Elasticsearch index "${this.index}" created`);
      }
    } catch (error) {
      logger.warn('Elasticsearch unavailable; database search will be used.', error);
    }
  }

  async indexEmail(email: any) {
    if (!elasticClient) return;
    try {
      await elasticClient.index({
        index: this.index,
        id: email.id,
        document: {
          id: email.id, recipientEmail: email.recipientEmail, senderEmail: email.senderEmail || '',
          subject: email.subject, body: email.body, status: email.status, scheduledAt: email.scheduledAt,
          sentAt: email.sentAt, campaignId: email.campaignId, userId: email.userId, senderId: email.senderId,
        },
      });
    } catch (error) {
      logger.warn(`Failed to index email ${email.id} in Elasticsearch`, error);
    }
  }

  async searchEmails(query: string, userId: string, status?: string) {
    if (elasticClient) {
      try {
        const must: any[] = [{ term: { userId } }];
        if (query) must.push({ multi_match: { query, fields: ['subject^2', 'recipientEmail^2', 'senderEmail', 'body'], type: 'best_fields', fuzziness: 'AUTO' } });
        if (status) must.push({ term: { status } });
        const result = await elasticClient.search({ index: this.index, query: { bool: { must } }, size: 50, sort: [{ scheduledAt: { order: 'desc' } }] });
        const ids = result.hits.hits.map((hit: any) => hit._id).filter(Boolean) as string[];
        if (ids.length) {
          const records = await prisma.email.findMany({ where: { id: { in: ids }, campaign: { userId } }, include: { sender: { select: { id: true, name: true, email: true, active: true } }, campaign: true } });
          const byId = new Map(records.map((record) => [record.id, record]));
          const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
          if (ordered.length) return ordered;
        }
      } catch (error) {
        logger.warn('Elasticsearch search failed; falling back to MySQL.', error);
      }
    }

    return prisma.email.findMany({
      where: {
        campaign: { userId },
        ...(status ? { status } : {}),
        ...(query ? { OR: [
          { subject: { contains: query } },
          { recipientEmail: { contains: query } },
          { body: { contains: query } },
          { sender: { email: { contains: query } } },
        ] } : {}),
      },
      include: { sender: { select: { id: true, name: true, email: true, active: true } }, campaign: true },
      orderBy: { scheduledAt: 'desc' },
      take: 50,
    });
  }
}

export const elasticsearchService = new ElasticsearchService();
