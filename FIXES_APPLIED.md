# ReachInbox review and fixes applied

This is a corrected working copy of the uploaded repository. The original upload was not overwritten.

## Backend and reliability

- Implemented the previously unimplemented `POST /api/campaigns` endpoint.
- Reworked campaign scheduling to persist email rows as a batch and enqueue BullMQ jobs with `addBulk`.
- Added compensation on queue-enqueue failure: pending rows are cancelled and corresponding queue jobs are removed best-effort.
- Added recipient normalization/deduplication and recipient-count limits.
- Enforced server-side minimum inter-send delay and maximum hourly sender limit.
- Fixed BullMQ retry state handling so failed attempts return to `scheduled` while retries remain and become `failed` only after the final attempt.
- Added a shared retry policy helper and tests.
- Fixed cancellation ordering to atomically transition `scheduled` to `cancelled` before queue cleanup, avoiding a worker/cancel race.
- Added fallback queue-job lookup by email ID because queue jobs are now created in a bulk operation.
- Made Elasticsearch optional and added MySQL search fallback, including fallback when the search index has no current hits.
- Made Slack and Google OAuth optional at application startup; endpoints return a clear service-unavailable response until configured.
- Added session-bound, random, one-time Slack OAuth state validation.
- Added Google OAuth state handling.
- Added graceful API and worker shutdown.
- Added liveness endpoint and made Elasticsearch optional in health checks.

## Security

- Protected the Bull Board route by disabling it unless both basic-auth credentials are configured.
- Added an origin check for cross-origin state-changing requests.
- Limited JSON and URL-encoded request body sizes.
- Enforced a 32-byte AES-256-GCM encryption key and updated encryption to use a 12-byte IV while retaining compatibility with 16-byte IV payloads.
- Encrypted sender SMTP credentials at rest.
- Changed sender/email/search API responses to exclude SMTP credential fields.
- Sanitized HTML before rendering message bodies in the browser.
- Removed nonfunctional login fields and inert compose/detail controls.

## Frontend and UX

- Fixed the hourly limit default so the form no longer sends zero.
- Added client-side validation for sender, recipients, subject, body, delay and schedule time.
- Fixed custom scheduling date minimum handling for local time zones.
- Fixed dropdown behavior so the schedule picker can be used without closing on input click.
- Improved recipient entry to accept comma/semicolon/whitespace-separated addresses.
- Clarified that Ethereal is a test SMTP service and not real campaign delivery.

## Deployment support

- Added `render.yaml` for separate API and persistent worker services.
- Added `DEPLOYMENT.md` for Vercel frontend, Render API/worker, managed MySQL and managed Redis setup.
- Rewrote the README to accurately describe the demo, architecture, local setup and constraints.
- Added `.nvmrc` for Node 20 and a root ESLint configuration.

## Remaining items that require your accounts or decisions

1. Run `npm ci`, `npm test`, `npm run lint`, and `npm run build` in an environment with registry access. Dependency installation could not complete in this workspace because npm registry access timed out, so a full build/test pass is not claimed.
2. Configure managed MySQL, a BullMQ-compatible Redis service, Google OAuth credentials, Vercel and Render environment variables.
3. Deploy the API and worker separately, apply Prisma migrations, then deploy the frontend.
4. Ethereal only creates test inbox previews. For real outbound email, add a production provider and implement domain verification, consent/unsubscribe, bounce and complaint handling.
5. The original improved copy used PostgreSQL. This MySQL edition changes the Prisma provider, initial migration, local Docker database, connection URL, and case-insensitive search behavior to MySQL.
6. Confirm the assessment terms allow public distribution of your implementation. Do not publish company-confidential source or assessment material if prohibited.


## MySQL conversion

- Switched the Prisma datasource and migration provider to MySQL.
- Replaced the initial PostgreSQL migration with MySQL-compatible DDL for all application tables, indexes, and foreign keys.
- Used `LONGTEXT` for campaign and email bodies and `TEXT` for stored error messages.
- Updated local Docker Compose to MySQL 8.4 while retaining Redis, BullMQ, and optional Elasticsearch.
- Updated `DATABASE_URL`, setup instructions, deployment guidance, and MySQL search fallback wording.
- Removed Prisma's PostgreSQL-only `mode: "insensitive"` query option; the MySQL database uses the configured case-insensitive `utf8mb4_unicode_ci` collation.

The MySQL conversion has been statically reviewed, but it has not yet been run against a live MySQL server in this environment. Run the verification steps in README before treating it as tested.
