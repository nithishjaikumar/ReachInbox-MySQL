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

## Deployment considerations
- Free-tier hosting options: Render (API and Background Worker), Vercel (Next.js Frontend), Aiven or TiDB Cloud (Managed MySQL), Upstash or Aiven (Redis).
- BullMQ requires standard Redis with blocking commands (`BRPOPLPUSH`/`BLMOVE`).
- Ethereal SMTP is for test preview delivery; production outbound delivery requires a verified email provider (e.g. Resend).

## Production email limitation
Ethereal is a test inbox and does not deliver real campaigns. Do not use real recipient lists until a production email provider, consent/unsubscribe handling, bounce/complaint handling, and provider compliance have been implemented and tested.
