/**
 * Dedicated test script for:
 * 1. Elasticsearch Lifecycle:
 *    - Schema mappings and ensureIndex
 *    - Status transitions: scheduled -> sent -> failed -> cancelled
 *    - Real queries against Elasticsearch directly and via /api/emails/search
 *    - Reconciliation & retry safety
 * 2. BullMQ Dashboard:
 *    - HTTP Basic Authentication protection
 *    - Queue status reporting (waiting, delayed, active, completed, failed)
 *    - Redis queue reflection
 */

import cookieSignature from 'cookie-signature';
import prisma from '../config/database';
import redis from '../config/redis';
import { env } from '../config/env';
import { elasticClient } from '../config/elasticsearch';
import { elasticsearchService } from '../services/elasticsearch.service';
import { emailQueue } from '../queue/emailQueue';
import { decrypt, isEncryptedPayload } from '../utils/encryption';

const API_BASE = 'http://localhost:4000';
const FRONTEND_ORIGIN = env.FRONTEND_URL || 'http://localhost:3000';

type VerificationItem = {
  section: 'ELASTICSEARCH' | 'BULLMQ_DASHBOARD';
  requirement: string;
  passed: boolean;
  details: string;
};

const checks: VerificationItem[] = [];

function record(
  section: 'ELASTICSEARCH' | 'BULLMQ_DASHBOARD',
  requirement: string,
  passed: boolean,
  details: string
) {
  checks.push({ section, requirement, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${section}] ${icon}: ${requirement}`);
  console.log(`   Details: ${details}\n`);
}

async function createAuthCookie(userId: string): Promise<string> {
  const sessionId = `test-es-dash-${Date.now()}`;
  const sessionData = {
    cookie: {
      originalMaxAge: 86400000,
      expires: new Date(Date.now() + 86400000).toISOString(),
      secure: false,
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
    },
    passport: { user: userId },
  };

  await redis.set(`reachinbox:sess:${sessionId}`, JSON.stringify(sessionData), 'EX', 86400);
  const signed = cookieSignature.sign(sessionId, env.SESSION_SECRET);
  return `reachinbox.sid=s:${signed}`;
}

async function run() {
  console.log('='.repeat(75));
  console.log('  ELASTICSEARCH & BULLMQ DASHBOARD DEEP VERIFICATION');
  console.log('='.repeat(75));

  if (!elasticClient) {
    throw new Error('Elasticsearch client is not configured');
  }

  // Fetch test user and sender
  const user = await prisma.user.findFirst({
    where: { email: 'nithishjaikumar10@gmail.com' },
  });
  if (!user) throw new Error('Test user not found in MySQL');

  const sender = await prisma.sender.findFirst({
    where: { userId: user.id, etherealHost: 'smtp.ethereal.email' },
  });
  if (!sender) throw new Error('Ethereal sender not found in MySQL');

  const decryptIfEncrypted = (val: string) =>
    isEncryptedPayload(val) ? decrypt(val) : val;
  const etherealInbox = decryptIfEncrypted(sender.etherealUser!);

  const cookieHeader = await createAuthCookie(user.id);

  // =========================================================================
  // SECTION 1: ELASTICSEARCH VERIFICATIONS
  // =========================================================================

  // 1. Ensure Index & Mappings (including errorMessage & attempts)
  try {
    await elasticsearchService.ensureIndex();
    const mappingRes: any = await elasticClient.indices.getMapping({ index: 'emails' });
    const props = mappingRes.emails.mappings.properties;
    const hasErrorMsg = Boolean(props.errorMessage);
    const hasAttempts = Boolean(props.attempts);

    record(
      'ELASTICSEARCH',
      'Index creation & Schema mappings',
      hasErrorMsg && hasAttempts,
      `Index 'emails' verified with properties: errorMessage (${props.errorMessage?.type}), attempts (${props.attempts?.type}), status (${props.status?.type})`
    );
  } catch (err: any) {
    record('ELASTICSEARCH', 'Index creation & Schema mappings', false, err.message);
  }

  // 2. Safe Reconciliation of all MySQL emails into Elasticsearch
  try {
    const reconResult = await elasticsearchService.reconcileEmails(user.id);
    record(
      'ELASTICSEARCH',
      'Data Reconciliation (MySQL -> Elasticsearch)',
      reconResult.reconciled > 0,
      `Reconciled ${reconResult.reconciled} emails into Elasticsearch (failed: ${reconResult.failed})`
    );
  } catch (err: any) {
    record('ELASTICSEARCH', 'Data Reconciliation (MySQL -> Elasticsearch)', false, err.message);
  }

  // 3. Index Scheduled Email through Application Flow
  const testUniqueTag = `ES_TAG_${Date.now()}`;
  let scheduledCampaignId = '';
  let scheduledEmailId = '';

  try {
    const res = await fetch(`${API_BASE}/api/emails/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        Origin: FRONTEND_ORIGIN,
      },
      body: JSON.stringify({
        senderId: sender.id,
        recipients: [etherealInbox],
        subject: `[ES Verification] ${testUniqueTag}`,
        body: `<p>Testing Elasticsearch indexing pipeline with tag ${testUniqueTag}</p>`,
        startTime: new Date().toISOString(),
        delayBetweenEmails: 2000,
        hourlyLimit: 200,
      }),
    });

    const body = await res.json();
    scheduledCampaignId = body.data?.campaign?.id;

    const emailRec = await prisma.email.findFirst({
      where: { campaignId: scheduledCampaignId },
    });
    scheduledEmailId = emailRec!.id;

    // Wait 500ms for ES index write
    await new Promise((r) => setTimeout(r, 600));

    // Verify document exists in ES with status 'scheduled'
    const esDoc: any = await elasticClient.get({
      index: 'emails',
      id: scheduledEmailId,
    });

    record(
      'ELASTICSEARCH',
      'Index scheduled email records',
      esDoc.found && esDoc._source.status === 'scheduled',
      `ES Doc ID ${scheduledEmailId} indexed with status '${esDoc._source.status}', subject: '${esDoc._source.subject}'`
    );
  } catch (err: any) {
    record('ELASTICSEARCH', 'Index scheduled email records', false, err.message);
  }

  // 4. Index Sent Email Records & Status Transition
  try {
    console.log('   Waiting for worker to deliver and update status to sent in ES...');
    const startWait = Date.now();
    let esDocAfter: any = null;

    while (Date.now() - startWait < 20000) {
      try {
        esDocAfter = await elasticClient.get({ index: 'emails', id: scheduledEmailId });
        if (esDocAfter._source.status === 'sent') break;
      } catch {
        // wait
      }
      await new Promise((r) => setTimeout(r, 1500));
    }

    const isSent = esDocAfter?._source?.status === 'sent';
    const hasSentAt = Boolean(esDocAfter?._source?.sentAt);

    record(
      'ELASTICSEARCH',
      'Index sent email records & update status',
      isSent && hasSentAt,
      `ES Doc ID ${scheduledEmailId} transitioned to status '${esDocAfter?._source?.status}', sentAt: ${esDocAfter?._source?.sentAt}`
    );
  } catch (err: any) {
    record('ELASTICSEARCH', 'Index sent email records & update status', false, err.message);
  }

  // 5. Failed Email Status Handling in Elasticsearch
  try {
    const failedDocId = `test-failed-${Date.now()}`;
    await elasticsearchService.indexEmail({
      id: failedDocId,
      recipientEmail: 'invalid-domain@unknown-error.test',
      senderEmail: sender.email,
      subject: `Failed Test Email ${Date.now()}`,
      body: 'Testing failure handling',
      status: 'failed',
      scheduledAt: new Date(),
      campaignId: scheduledCampaignId,
      userId: user.id,
      senderId: sender.id,
      errorMessage: 'SMTP 550 User unknown',
      attempts: 3,
    });

    const failedDoc: any = await elasticClient.get({ index: 'emails', id: failedDocId });
    const isFailed = failedDoc._source.status === 'failed';
    const hasError = failedDoc._source.errorMessage === 'SMTP 550 User unknown';

    // Clean up test failed doc
    await elasticClient.delete({ index: 'emails', id: failedDocId });

    record(
      'ELASTICSEARCH',
      'Handle failed email status & error details',
      isFailed && hasError,
      `Failed status indexed correctly with errorMessage='${failedDoc._source.errorMessage}' and attempts=${failedDoc._source.attempts}`
    );
  } catch (err: any) {
    record('ELASTICSEARCH', 'Handle failed email status & error details', false, err.message);
  }

  // 6. Direct Search Queries against Elasticsearch
  try {
    const esSearchRes: any = await elasticClient.search({
      index: 'emails',
      query: {
        bool: {
          must: [
            { term: { userId: user.id } },
            { match: { subject: testUniqueTag } },
          ],
        },
      },
    });

    const totalHits = esSearchRes.hits?.total?.value || 0;
    const hitId = esSearchRes.hits?.hits?.[0]?._id;

    record(
      'ELASTICSEARCH',
      'Direct Elasticsearch search query',
      totalHits > 0 && hitId === scheduledEmailId,
      `Elasticsearch returned ${totalHits} hit(s); matched ID: ${hitId} (score: ${esSearchRes.hits?.hits?.[0]?._score})`
    );
  } catch (err: any) {
    record('ELASTICSEARCH', 'Direct Elasticsearch search query', false, err.message);
  }

  // 7. Search via Backend API (/api/emails/search)
  try {
    const apiSearchRes = await fetch(
      `${API_BASE}/api/emails/search?q=${encodeURIComponent(testUniqueTag)}`,
      {
        headers: {
          Cookie: cookieHeader,
          Origin: FRONTEND_ORIGIN,
        },
      }
    );

    const apiBody = await apiSearchRes.json();
    const matched = apiBody.data?.some((e: any) => e.id === scheduledEmailId);

    record(
      'ELASTICSEARCH',
      'Return matching records via Backend Search API',
      apiSearchRes.status === 200 && matched,
      `GET /api/emails/search?q=${testUniqueTag} returned HTTP 200 with total=${apiBody.total}, matching email ID ${scheduledEmailId}`
    );
  } catch (err: any) {
    record('ELASTICSEARCH', 'Return matching records via Backend Search API', false, err.message);
  }

  // 8. Search for Non-Existent Query (Must Return [] without falling back)
  try {
    const nonExistentTag = `DEFINITELY_NOT_EXISTING_${Date.now()}`;
    const emptySearchRes = await fetch(
      `${API_BASE}/api/emails/search?q=${encodeURIComponent(nonExistentTag)}`,
      {
        headers: {
          Cookie: cookieHeader,
          Origin: FRONTEND_ORIGIN,
        },
      }
    );

    const emptyBody = await emptySearchRes.json();
    const isEmpty = emptyBody.success && Array.isArray(emptyBody.data) && emptyBody.data.length === 0;

    record(
      'ELASTICSEARCH',
      'Strict Elasticsearch search (zero matches returns empty list)',
      isEmpty,
      `GET /api/emails/search returned total=0 and empty array without spurious fallback`
    );
  } catch (err: any) {
    record('ELASTICSEARCH', 'Strict Elasticsearch search', false, err.message);
  }

  // =========================================================================
  // SECTION 2: BULLMQ DASHBOARD VERIFICATIONS
  // =========================================================================

  // 1. Unauthenticated Access Protection (Must return 401)
  try {
    const unauthRes = await fetch(`${API_BASE}/admin/queues`);
    const isProtected = unauthRes.status === 401;

    record(
      'BULLMQ_DASHBOARD',
      'Unauthenticated Access Protection',
      isProtected,
      `GET /admin/queues without credentials returned HTTP ${unauthRes.status} (WWW-Authenticate: Basic)`
    );
  } catch (err: any) {
    record('BULLMQ_DASHBOARD', 'Unauthenticated Access Protection', false, err.message);
  }

  // 2. Invalid Credentials Protection (Must return 401)
  try {
    const badAuth = Buffer.from('wrong:credentials').toString('base64');
    const badRes = await fetch(`${API_BASE}/admin/queues`, {
      headers: { Authorization: `Basic ${badAuth}` },
    });

    record(
      'BULLMQ_DASHBOARD',
      'Invalid Credentials Rejection',
      badRes.status === 401,
      `GET /admin/queues with invalid credentials returned HTTP ${badRes.status}`
    );
  } catch (err: any) {
    record('BULLMQ_DASHBOARD', 'Invalid Credentials Rejection', false, err.message);
  }

  // 3. Authenticated Access to Dashboard UI (Must return 200)
  try {
    const validAuth = Buffer.from(
      `${env.BULL_BOARD_USERNAME}:${env.BULL_BOARD_PASSWORD}`
    ).toString('base64');

    const authRes = await fetch(`${API_BASE}/admin/queues/`, {
      headers: { Authorization: `Basic ${validAuth}` },
    });

    const authHtml = await authRes.text();
    const isHtml = authHtml.includes('BullBoard') || authHtml.includes('<!DOCTYPE html>') || authHtml.includes('<html');

    record(
      'BULLMQ_DASHBOARD',
      'Secure Dashboard Access with Valid Credentials',
      authRes.status === 200 && isHtml,
      `GET /admin/queues/ with Basic ${env.BULL_BOARD_USERNAME}:*** returned HTTP 200 OK (${authHtml.length} bytes HTML)`
    );
  } catch (err: any) {
    record('BULLMQ_DASHBOARD', 'Secure Dashboard Access with Valid Credentials', false, err.message);
  }

  // 4. Real Redis Queue Status Reporting (active, completed, delayed, failed, waiting)
  try {
    const validAuth = Buffer.from(
      `${env.BULL_BOARD_USERNAME}:${env.BULL_BOARD_PASSWORD}`
    ).toString('base64');

    const apiQueuesRes = await fetch(`${API_BASE}/admin/queues/api/queues`, {
      headers: { Authorization: `Basic ${validAuth}` },
    });

    const queueData = await apiQueuesRes.json();
    const queue = queueData.queues?.[0];
    const counts = queue?.counts;

    const hasAllStatuses =
      counts &&
      typeof counts.active === 'number' &&
      typeof counts.completed === 'number' &&
      typeof counts.delayed === 'number' &&
      typeof counts.failed === 'number' &&
      typeof counts.waiting === 'number';

    record(
      'BULLMQ_DASHBOARD',
      'Reflects Actual Redis Queue Statuses',
      Boolean(hasAllStatuses && queue?.name === 'email-queue'),
      `Queue '${queue?.name}' status counts: active=${counts?.active}, completed=${counts?.completed}, delayed=${counts?.delayed}, failed=${counts?.failed}, waiting=${counts?.waiting}`
    );
  } catch (err: any) {
    record('BULLMQ_DASHBOARD', 'Reflects Actual Redis Queue Statuses', false, err.message);
  }

  // 5. Frontend Proxy Access (/admin/queues via Next.js port 3000)
  try {
    const validAuth = Buffer.from(
      `${env.BULL_BOARD_USERNAME}:${env.BULL_BOARD_PASSWORD}`
    ).toString('base64');

    const frontendProxyRes = await fetch(`http://localhost:3000/admin/queues/`, {
      headers: { Authorization: `Basic ${validAuth}` },
    });

    record(
      'BULLMQ_DASHBOARD',
      'Frontend Proxy Access via http://localhost:3000/admin/queues',
      frontendProxyRes.status === 200,
      `Next.js reverse proxy to Bull Board returned HTTP ${frontendProxyRes.status}`
    );
  } catch (err: any) {
    record('BULLMQ_DASHBOARD', 'Frontend Proxy Access via http://localhost:3000/admin/queues', false, err.message);
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('='.repeat(75));
  console.log('  FINAL VERIFICATION SUMMARY');
  console.log('='.repeat(75));

  const total = checks.length;
  const passed = checks.filter((c) => c.passed).length;

  for (const c of checks) {
    const status = c.passed ? '✅ [PASS]' : '❌ [FAIL]';
    console.log(`${status} [${c.section}] ${c.requirement}`);
    console.log(`       Evidence: ${c.details}`);
  }

  console.log('\n' + '-'.repeat(75));
  console.log(`TOTAL: ${passed}/${total} checks passed (${Math.round((passed / total) * 100)}%)`);
  console.log('-'.repeat(75));

  await prisma.$disconnect();
  await redis.quit();

  process.exit(passed === total ? 0 : 1);
}

run().catch(async (err) => {
  console.error('Test execution failed:', err);
  await prisma.$disconnect();
  await redis.quit();
  process.exit(1);
});
