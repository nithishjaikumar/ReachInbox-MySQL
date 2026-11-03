import { Client } from '@elastic/elasticsearch';
import { env, isElasticsearchConfigured } from './env';
import logger from '../utils/logger';

export const elasticClient = isElasticsearchConfigured
  ? new Client({
      node: env.ELASTICSEARCH_URL!,
      ...(env.ELASTICSEARCH_API_KEY
        ? { auth: { apiKey: env.ELASTICSEARCH_API_KEY } }
        : {}),
    })
  : null;

export const checkElasticConnection = async () => {
  if (!elasticClient) return false;
  try {
    await elasticClient.ping();
    logger.info('Elasticsearch connected');
    return true;
  } catch (error) {
    logger.warn('Elasticsearch unavailable; database search will be used.', error);
    return false;
  }
};
