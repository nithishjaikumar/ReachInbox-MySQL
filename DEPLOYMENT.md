# ReachInbox deployment guide

This repository is a monorepo with three independently-running processes: Next.js frontend, Express API, and BullMQ worker. The API and worker must both remain online. A frontend-only deployment is not sufficient.

## Production architecture

- Frontend: Vercel (Next.js, project root `apps/frontend`).
- API: Render Web Service (Node runtime, repository root).
- Worker: Render Background Worker (same repository and build, separate process).
- Database: managed MySQL 8.0+ / 8.4 (for example, Aiven, DigitalOcean Managed MySQL, or another MySQL-compatible provider).
- Queue/session store: managed Redis (Upstash Redis or equivalent Redis-compatible service).
- Email delivery: a verified SMTP provider or transactional email service. Ethereal is only a test inbox and does not deliver real campaigns.
- Search: Elasticsearch is optional. The app falls back to MySQL search if it is not configured.

## 1. Provision infrastructure

Create a MySQL database (MySQL 8.0+; MySQL 8.4 recommended) and a Redis instance. Copy their connection URLs. Confirm that the Redis provider supports BullMQ blocking commands and is not a serverless REST-only Redis API. Use a persistent/production Redis endpoint.

## 2. Backend API service

Create a Render Web Service from this repository.

- Root directory: repository root
- Build command: `npm ci && npm run db:generate -w apps/backend && npm run build -w packages/shared && npm run build -w apps/backend`
- Start command: `npm run start -w apps/backend`
- Health check path: `/api/health`

Set these environment variables in the service:

- `NODE_ENV=production`
- `PORT=4000` (Render may inject PORT; the app honors it)
- `DATABASE_URL` = managed MySQL connection URL, for example `mysql://USER:PASSWORD@HOST:3306/DATABASE`
- `REDIS_URL` = managed Redis URL
- `FRONTEND_URL` = deployed Vercel URL, no trailing slash
- `SESSION_SECRET` = unique random secret, at least 32 characters
- `ENCRYPTION_KEY` = 64 hex characters (32 bytes) recommended
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` = Google OAuth credentials
- `ETHEREAL_*` only for test mode; for real sending, configure a real provider and update the SMTP adapter before enabling production sending
- `BULL_BOARD_USERNAME` and `BULL_BOARD_PASSWORD` only if you need the protected queue dashboard
- `ELASTICSEARCH_URL` and `ELASTICSEARCH_API_KEY` are optional
- `SLACK_*` are optional

Google OAuth authorized JavaScript origin should be `https://YOUR-FRONTEND-HOST`; the authorized redirect URI must be exactly `https://YOUR-API-HOST/api/auth/google/callback`. Keep the URLs in the Google Cloud console and Render environment variables identical.

## 3. Database migration

Run the Prisma migration against the production database before starting the app:

`npx prisma migrate deploy --schema apps/backend/prisma/schema.prisma`

Generate Prisma client during the build with `npm run db:generate -w apps/backend`.

## 4. Worker service

Create a Render Background Worker from the same repository.

- Build command: same as API service
- Start command: `npm run worker:start -w apps/backend`
- Environment variables: same `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY`, and email-provider configuration as the API.

Do not run the worker only inside the web process. The worker is a separate persistent process and must use the same Redis and database.

## 5. Frontend on Vercel

Import the repository into Vercel and configure:

- Root directory: `apps/frontend`
- Install command: `cd ../.. && npm ci`
- Build command: `cd ../.. && npm run build -w apps/frontend`
- Output: let Vercel detect Next.js

Set `NEXT_PUBLIC_API_URL=https://YOUR-API-HOST` (no trailing slash). Redeploy after setting it.

## 6. Production email sending warning

The current implementation uses Ethereal SMTP, which is a testing service. It creates preview links and is not a production email delivery provider. Do not connect a real mailing list or claim live email delivery until a real provider adapter (for example, SES, SendGrid, Mailgun, or Postmark) is implemented, verified, and tested. Respect provider policies, unsubscribe requirements, consent, bounce handling, and applicable anti-spam laws.

## 7. Verify deployment

- `GET https://YOUR-API-HOST/api/health` should report database and Redis as `up`.
- Open `https://YOUR-FRONTEND-HOST` and complete Google OAuth.
- Add a test sender and schedule a test email to an address you control.
- Confirm the worker logs show the job being processed.
- Confirm scheduled/sent status in the dashboard.
- Verify CORS and session cookies across the frontend/API domains.

## Important limitations before public portfolio use

The app is a technical assessment/demo implementation. Review assessment terms before publishing. Never commit `.env`, OAuth secrets, SMTP credentials, access tokens, production customer data, or company-confidential code. A successful build/deployment does not mean production-grade bulk email compliance or deliverability.
