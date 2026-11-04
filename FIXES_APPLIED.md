# ReachInbox Review and Fixes Applied

This is a corrected working copy of the ReachInbox repository configured for MySQL 8.4.

## Google OAuth & Session Login Loop Fix

### Root Cause
1. **Frontend API URL concatenation**: When Next.js rewrites were introduced to proxy `/api/:path*` to the backend, Axios in `apps/frontend/src/lib/api.ts` was set to `baseURL: '/api'`. However, all TanStack Query hooks (e.g. `useAuth`, `useEmails`, `useSenders`, `useSlack`) were written with `/api/...` prefixes (e.g. `api.get('/api/auth/me')`). This caused Axios to request `/api/api/auth/me`, which routed to a 404 endpoint. The failed request caused `AuthGuard` on `/dashboard` to immediately bounce users back to `/login`.
2. **Helmet Cross-Origin Resource Policy (CORP)**: In `apps/backend/src/app.ts`, default `helmet()` set `Cross-Origin-Resource-Policy: same-origin`, which instructed browsers to block any direct cross-origin responses from `localhost:4000` to `localhost:3000`.
3. **Google strategy upsert robustness**: In `apps/backend/src/auth/google.ts`, `prisma.user.upsert` failed if `profile.displayName` was missing during an update, and did not account for matching either by `googleId` or `email`, causing potential unhandled rejection.
4. **Login UX and Error Handling**: The login page had a hardcoded static message stating Google OAuth must be configured, ignored URL query parameters (`?error=...`), and did not redirect already-authenticated users to `/dashboard`.
5. **Logout and Session Teardown**: Logout lacked an explicit `path: '/'` on `res.clearCookie`, and the frontend UI had no wired sign-out button in the sidebar.

### Fixes Implemented
- **`apps/frontend/src/lib/api.ts`**: Normalized `baseURL` calculation to support Next.js same-origin rewrites (`baseURL = ''` when `NEXT_PUBLIC_API_URL` is omitted) while safely stripping trailing slashes or `/api` suffixes if provided, guaranteeing clean single `/api/...` requests without duplication.
- **`apps/frontend/next.config.js`**: Verified rewrites for `/api/:path*` and `/admin/:path*` to the backend API origin (`process.env.API_SERVER_URL || 'http://localhost:4000'`).
- **`apps/backend/src/app.ts`**: Configured Helmet with `crossOriginResourcePolicy: { policy: 'cross-origin' }`.
- **`apps/backend/src/auth/google.ts`**: Refactored user retrieval to query `findFirst` on `googleId` OR `email`, and safely update/create with fallback display names and avatar URLs.
- **`apps/backend/src/routes/auth.routes.ts`**: Added explicit `path: '/'` when clearing `reachinbox.sid` on logout.
- **`apps/frontend/src/app/login/page.tsx`**: Replaced static misleading message, added automated redirection to `/dashboard` for active sessions, added query error message display (`?error=google_auth_failed`), and wrapped `useSearchParams` in `<Suspense>`.
- **`apps/frontend/src/components/layout/Sidebar.tsx`**: Added a functional "Sign out" button connected to `useAuth().logout`.
- **`apps/frontend/src/app/page.tsx`**: Redirects `/` to `/dashboard` (which `AuthGuard` guards).

## Backend and Reliability

- Implemented the `POST /api/campaigns` endpoint.
- Reworked campaign scheduling to persist email rows as a batch and enqueue BullMQ jobs with `addBulk`.
- Added compensation on queue-enqueue failure: pending rows are cancelled and corresponding queue jobs are removed best-effort.
- Added recipient normalization/deduplication and recipient-count limits.
- Enforced server-side minimum inter-send delay and maximum hourly sender limit.
- Fixed BullMQ retry state handling so failed attempts return to `scheduled` while retries remain and become `failed` only after the final attempt.
- Added a shared retry policy helper and unit tests.
- Fixed cancellation ordering to atomically transition `scheduled` to `cancelled` before queue cleanup, avoiding a worker/cancel race.
- Added fallback queue-job lookup by email ID because queue jobs are created in a bulk operation.
- Made Elasticsearch optional and added MySQL search fallback.
- Added session-bound, random, one-time Slack OAuth state validation.
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

## MySQL Conversion

- Switched Prisma datasource and migration provider to MySQL.
- Replaced initial PostgreSQL migration with MySQL-compatible DDL for all application tables, indexes, and foreign keys.
- Used `LONGTEXT` for campaign and email bodies and `TEXT` for stored error messages.
- Updated local Docker Compose to MySQL 8.4 while retaining Redis, BullMQ, and optional Elasticsearch.
- Removed Prisma's PostgreSQL-only `mode: "insensitive"` query option; the MySQL database uses the configured case-insensitive `utf8mb4_unicode_ci` collation.
