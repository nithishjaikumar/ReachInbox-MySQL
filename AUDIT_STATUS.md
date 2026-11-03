# MySQL Conversion Audit Status

## Scope
This is the MySQL edition of the ReachInBox technical assessment/demo. The PostgreSQL source project is not modified by this conversion.

## Static checks completed
- Prisma datasource provider is `mysql`.
- Prisma migration lock provider is `mysql`.
- Initial migration uses MySQL DDL, `utf8mb4`, MySQL `DATETIME(3)`, indexes, and foreign keys.
- Prisma schema uses MySQL-compatible `LongText`/`Text` field annotations for large email content and error text.
- `.env.example` uses a MySQL connection URL.
- Docker Compose defines MySQL 8.4 and Redis; PostgreSQL service and volume are removed.
- Application database access is through Prisma Client; health check uses portable `SELECT 1`.
- Search fallback uses Prisma `contains` filters and no PostgreSQL-only `mode: insensitive` option.
- Deployment guide separates the API, persistent worker, MySQL database, Redis, and frontend.
- Fixed the Slack frontend's local API fallback from port 3000 to port 4000.
- Added an explicit `db:migrate:deploy` npm script and deployment environment entries for SMTP, optional Slack/search, and worker settings.

## Checks not completed in this environment
- `npm ci`, TypeScript build, frontend build, lint, and Vitest could not be completed because this environment could not resolve `registry.npmjs.org` (DNS/network error `EAI_AGAIN`).
- MySQL/Redis Docker integration tests could not be run because Docker is not installed in this environment.
- No hosted deployment has been performed. That requires user-owned hosting/database/Redis accounts and production secrets.

## Required before committing or claiming deployment
1. Run `npm ci` on a machine with npm registry access.
2. Start MySQL and Redis using `docker compose up -d mysql redis`.
3. Copy `.env.example` to `.env`, set strong secrets, and configure OAuth/SMTP test credentials.
4. Run `npm run db:generate`, `npm run db:migrate:deploy`, `npm test`, `npm run lint`, and `npm run build`.
5. Test API health, Google OAuth, sender creation, scheduling, cancellation, worker processing, and MySQL persistence locally.
6. Deploy API and worker as separate persistent services, frontend separately, and configure managed MySQL and Redis.
7. Verify deployed health endpoints and a controlled test email preview before committing the final verified state.

## Production email limitation
Ethereal is a test inbox and does not deliver real campaigns. Do not use real recipient lists until a production email provider, consent/unsubscribe handling, bounce/complaint handling, and provider compliance have been implemented and tested.
