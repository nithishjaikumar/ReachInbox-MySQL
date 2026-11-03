# ReachInbox — Email Scheduling & Campaign Management

A full-stack technical assessment project demonstrating a campaign composition interface, REST API, delayed background jobs, distributed sender rate limiting, and email status tracking.

> **Portfolio note:** This is an independent technical assessment/demo implementation. It is not the production ReachInbox service. Review the assessment rules before publishing assessment code. The configured Ethereal SMTP adapter is for test delivery and preview links only; it is not a production bulk-email provider.

## Features implemented

- Google OAuth sign-in with Redis-backed sessions (requires Google OAuth credentials).
- Sender setup using temporary Ethereal test SMTP accounts.
- Campaign/email scheduling through a REST API.
- BullMQ delayed jobs backed by Redis and processed by a separate worker process.
- Per-sender hourly rate limiting using an atomic Redis Lua script.
- Idempotency keys and database state transitions to reduce duplicate processing.
- Email lists, detail views, cancellation, and search.
- MySQL 8.4 persistence through Prisma ORM.
- Optional Elasticsearch indexing/search; MySQL search fallback works when Elasticsearch is not configured.
- Optional Slack OAuth notifications with session-bound state validation.
- Next.js, React and TypeScript frontend.
- Vitest unit tests.

## Architecture

```text
Next.js frontend
      | HTTPS + session cookie
      v
Express API ---------------- MySQL (Prisma)
      |                              |
      | schedule email jobs          | email status/source of truth
      v                              |
Redis + BullMQ <---------------------+
      |
      v
Dedicated BullMQ worker ---> Ethereal SMTP (test delivery)
      |
      +----> Optional Elasticsearch search index
      +----> Optional Slack notifications
```

The API and worker are separate processes. Both must run for scheduled messages to be processed. Redis is used for BullMQ and session storage. MySQL is the source of truth. Elasticsearch is optional.

## Technology stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, TanStack Query, Axios, Tiptap.
- **Backend:** Node.js, Express, TypeScript, Passport, Zod.
- **Database:** MySQL 8.4, Prisma ORM.
- **Queue/cache/session:** Redis, BullMQ, ioredis, connect-redis.
- **Integrations:** Google OAuth, optional Slack API, Nodemailer/Ethereal test SMTP.
- **Search:** Optional Elasticsearch with MySQL fallback.
- **Testing:** Vitest.

## Repository layout

```text
apps/
  backend/
    prisma/          Prisma schema and migrations
    src/auth/        Google OAuth and auth middleware
    src/config/      Environment, database, Redis, session, search config
    src/queue/       BullMQ queue and worker
    src/routes/      REST API routes
    src/services/    Email, sender, rate-limit, Slack and search services
    src/__tests__/   Unit tests
  frontend/
    src/app/         Next.js pages
    src/components/  Compose, email, auth, layout and UI components
    src/hooks/       React Query hooks
    src/lib/         API client and query client
packages/shared/    Shared TypeScript schemas and types
```

## Requirements

- Node.js 20 LTS recommended (Node 18+ supported by the root package).
- npm 10+.
- Docker Desktop for local MySQL 8.4 and Redis.
- Google OAuth credentials for sign-in.

Elasticsearch and Slack credentials are optional.

## Local setup

1. Install dependencies from the repository root:

   ```bash
   npm ci
   ```

2. Start local infrastructure:

   ```bash
   docker compose up -d mysql redis
   ```

   Elasticsearch is not required; the app uses MySQL search when it is absent.

3. Copy `.env.example` to `.env` and set at minimum:

   ```env
   NODE_ENV=development
   PORT=4000
   FRONTEND_URL=http://localhost:3000
   DATABASE_URL=mysql://reachinbox:reachinbox_pass@localhost:3306/reachinbox
   REDIS_URL=redis://localhost:6379
   SESSION_SECRET=replace-with-a-random-string-at-least-32-characters
   ENCRYPTION_KEY=replace-with-64-hex-characters
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
   ```

   Generate a valid encryption key with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Generate Prisma client and apply migrations:

   ```bash
   npm run db:generate
   npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma
   ```

   For a new local database where you are developing schema changes, `npm run db:migrate` runs Prisma's development migration workflow.

5. Start three processes in separate terminals:

   ```bash
   npm run dev:backend
   npm run dev:worker
   npm run dev:frontend
   ```

6. Open `http://localhost:3000`. API health check: `http://localhost:4000/api/health`.

## Tests and builds

```bash
npm test
npm run build
```

The test suite currently contains unit-level checks for validation, scheduling calculations, encryption/rate-limit utilities and retry policy. It is not a substitute for end-to-end tests against real MySQL, Redis, OAuth and SMTP services.

## Environment variables

See `.env.example` for the full template. Required backend variables are `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, and `ENCRYPTION_KEY`. Google OAuth variables are required to use Google sign-in. Slack and Elasticsearch are optional.

Never commit `.env`, OAuth secrets, SMTP credentials, access tokens, private datasets or production customer data. SMTP credentials created for senders are encrypted before storage and omitted from API responses. Keep the encryption key stable across deployments and backups; rotating it without re-encrypting stored credentials will make them unreadable.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the deployment architecture and step-by-step setup for a Vercel frontend, Render API and worker, managed MySQL and managed Redis.

A public frontend alone is not a working deployment. The API, worker, database and Redis must all be configured. The Ethereal integration only creates test emails and preview links. To send real email, integrate and verify a production email provider, configure domain authentication (SPF/DKIM/DMARC), and implement consent, unsubscribe, bounce and complaint handling before sending to real recipients.

## Known deployment constraints

- The database provider is MySQL 8.4 through Prisma.
- Google OAuth requires a configured OAuth client and exact callback URL.
- The BullMQ worker must run continuously as a separate background process.
- Redis must support BullMQ blocking operations; a REST-only Redis API is not sufficient.
- Production email delivery is not enabled by the Ethereal test adapter.
- Elasticsearch is optional; without it, search uses MySQL.
