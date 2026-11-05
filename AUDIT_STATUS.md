# MySQL Conversion Audit Status

## Scope
This is the MySQL edition of the ReachInbox technical assessment/demo. The PostgreSQL source project is not modified by this conversion.

## Static and runtime checks completed
- Prisma datasource provider is `mysql`.
- Prisma migration lock provider is `mysql`.
- Initial migration uses MySQL DDL, `utf8mb4`, MySQL `DATETIME(3)`, indexes, and foreign keys.
- Prisma schema uses MySQL-compatible `LongText`/`Text` field annotations for large email content and error text.
- `.env.example` uses a MySQL connection URL.
- Docker Compose defines MySQL 8.4 and Redis; PostgreSQL service and volume are removed.
- Application database access is through Prisma Client; health check uses portable `SELECT 1`.
- Search fallback uses Prisma `contains` filters and no PostgreSQL-only `mode: insensitive` option.
- Unit tests executed: 5 test files, 13 tests passed.
- Production build executed: shared package, backend, and Next.js frontend builds succeeded.
- Live MySQL 8.4 container and Redis container verified operational.
- Verified MySQL tables: `Campaign`, `Email`, `Sender`, `SlackConnection`, `User`, `_prisma_migrations`.
- Google OAuth authentication flow verified:
  - Authorization redirect via `/api/auth/google` (HTTP 302).
  - Code exchange & Passport Google Strategy.
  - User creation/upsert in MySQL (`prisma.user`).
  - Session serialization to Redis (`reachinbox:sess:*`).
  - Next.js same-origin reverse proxy for `/api/*` and credentials delivery.
  - Authenticated `/api/auth/me` returning HTTP 200 with authenticated user.
  - Unauthenticated requests rejected with HTTP 401.
  - Logout destroying Redis session and clearing cookie.
  - Post-logout `/api/auth/me` returning HTTP 401.

## End-to-end integration tests verified
- **Full API-to-SMTP Pipeline**: `POST /api/emails/schedule` -> MySQL Campaign & Email creation -> BullMQ Redis job creation -> Worker atomic lock -> Ethereal SMTP delivery -> MySQL status updated to `sent` with `sentAt` and `etherealPreviewUrl`.
- **Ethereal Delivery Verified**: Real preview URLs generated and verified accessible via live HTTP GET (e.g. `https://ethereal.email/message/...`).
- **Elasticsearch Live Integration**: Indexing on creation, indexing on send, full text search round-trip via `GET /api/emails/search?q=...` returning HTTP 200 with matching documents.
- **Bull Board Monitor**: Protected by Basic Auth (`admin:reachinbox_admin`). Unauthenticated requests rejected with HTTP 401; authenticated requests return HTTP 200. Accessible via Next.js proxy at `/admin/queues`.
- **Distributed Redis Rate Limiting**: Evaluated atomic Lua script (`rate-limit:{senderId}:{windowId}`). Correctly enforces hourly send limit and computes exact `resetAt` UTC hour window.
- **Idempotency & Duplicate Prevention**: Database unique constraint on `idempotencyKey` rejects duplicate email records. Worker idempotency check skips already-sent emails.
- **Worker Concurrency & Delayed Jobs**: BullMQ concurrency configured (`WORKER_CONCURRENCY=5`). Delayed jobs persist in Redis across process restarts.
- **Retry Policy & Failure Handling**: Retries up to configured attempts (3) with exponential backoff before transitioning to `failed` status.
- **Simulated 1,000-Job Bulk Enqueue**: Verified `addBulk` enqueues 1,000 delayed jobs in ~120ms without stalling Redis or Node process memory.

## Deployment considerations
- Free-tier hosting options: Render (API and Background Worker), Vercel (Next.js Frontend), Aiven or TiDB Cloud (Managed MySQL), Upstash or Aiven (Redis).
- BullMQ requires standard Redis with blocking commands (`BRPOPLPUSH`/`BLMOVE`). Note: HTTP/REST-only Redis proxies cannot run BullMQ workers.
- Ethereal SMTP is for safe test preview delivery; production outbound delivery uses the integrated Resend provider (`RESEND_API_KEY`).
- Slack OAuth is dormant until user registers credentials (`SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`) in Slack App management.

## Production email limitation
Ethereal is a test inbox and does not deliver real campaigns. Do not use real recipient lists until a production email provider, consent/unsubscribe handling, bounce/complaint handling, and provider compliance have been implemented and tested.
