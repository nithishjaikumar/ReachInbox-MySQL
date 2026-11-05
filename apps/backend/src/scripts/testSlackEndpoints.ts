import cookieSignature from 'cookie-signature';
import redis from '../config/redis';
import prisma from '../config/database';
import { env } from '../config/env';

const API_BASE = 'http://localhost:4000';

async function testSlackEndpoints() {
  console.log('--- Testing Slack API Endpoints ---');
  const user = await prisma.user.findFirst({ where: { email: 'nithishjaikumar10@gmail.com' } });
  if (!user) throw new Error('User not found');

  const sessionId = `test-slack-ep-${Date.now()}`;
  const sessionData = {
    cookie: { originalMaxAge: 86400000, expires: new Date(Date.now() + 86400000).toISOString(), secure: false, httpOnly: true, path: '/', sameSite: 'lax' },
    passport: { user: user.id },
  };
  await redis.set(`reachinbox:sess:${sessionId}`, JSON.stringify(sessionData), 'EX', 86400);
  const signed = cookieSignature.sign(sessionId, env.SESSION_SECRET);
  const cookieHeader = `reachinbox.sid=s:${signed}`;

  // 1. Status endpoint
  const statusRes = await fetch(`${API_BASE}/api/slack/status`, {
    headers: { Cookie: cookieHeader, Origin: 'http://localhost:3000' },
  });
  console.log('GET /api/slack/status ->', statusRes.status, await statusRes.json());

  // 2. Connect endpoint without credentials -> 503
  const connectRes = await fetch(`${API_BASE}/api/slack/connect`, {
    headers: { Cookie: cookieHeader, Origin: 'http://localhost:3000' },
    redirect: 'manual',
  });
  console.log('GET /api/slack/connect ->', connectRes.status, await connectRes.json());

  // Clean up
  await redis.del(`reachinbox:sess:${sessionId}`);
  await prisma.$disconnect();
  await redis.quit();
}

testSlackEndpoints().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  await redis.quit();
  process.exit(1);
});

