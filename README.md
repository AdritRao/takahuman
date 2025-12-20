# Notes App

## codebase updates
- Added full prod backend w/ PostgreSQL (via Prisma), Redis (refresh sessions, cache, rate limits), Argon2id passwords, CSRF, stateless JWT access + rotating refresh tokens, structured logging, health check.
- Multi-tenant organizations: organizations, memberships (OWNER/ADMIN/MEMBER), org-scoped notes, invites.
- Frontend aligned to secure cookies: no localStorage tokens; Axios sends credentials + CSRF automatically.

## Stack
- Backend: Node.js, Express, TypeScript, Prisma (PostgreSQL), Redis (ioredis), Argon2id, Zod, Pino
- Frontend: Next.js (App Router, TypeScript), Tailwind CSS, Axios

## Repo Structure
```
backend/   # REST API, Prisma schema, security & org logic
frontend/  # Next.js app
```

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or a managed service like Neon/RDS)
- Redis 6+ (or a managed service like Upstash/Elasticache)

## Backend: Setup & Run
1) Install:
```
cd backend
npm install
```

2) Configure environment in `backend/.env`:
```
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:3000

# PostgreSQL
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/notes_app

# Redis
REDIS_URL=redis://localhost:6379

# Secrets
JWT_SECRET=replace_with_long_random_secret
# Auth cookies and TTLs
ACCESS_COOKIE_NAME=access_token
REFRESH_COOKIE_NAME=refresh_token
JWT_ACCESS_TTL_MIN=15
JWT_REFRESH_TTL_DAYS=30
TRUST_PROXY=true
```

2.1) Start local Postgres + Redis (recommended):
From the repo root:
```
docker compose up -d
```
This launches Postgres on 5432 and Redis on 6379, matching the `.env` above.

3) Prisma generate & migrate:
```
npm run db:generate
npx prisma migrate dev --name init_pg
```
If migrating from SQLite, create a fresh Postgres DB and run the migration then data migration is out-of-scope for this sample.

4) Run the API:
```
npm run dev
```
- Health: GET `http://localhost:4000/healthz`

5) Optional: Prisma Studio
```
npx prisma studio
```

## Frontend: Setup & Run
1) Install:
```
cd frontend
npm install
```

2) Configure `frontend/.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

3) Run:
```
npm run dev
```

## Security & Auth Model
- Stateless access JWT (short-lived) + rotating refresh token stored as httpOnly cookies.
  - Access: signed with `JWT_SECRET`, includes `tokenVersion`, 15m default.
  - Refresh: associated Redis refresh session with `sessionId` + `jti`; rotation on `/auth/refresh` with reuse detection.
  - Global revoke: increment `User.tokenVersion` (done on password reset and token reuse detection).
- CSRF: double-submit cookie + `x-csrf-token` header for non-auth, state-changing routes. Auth routes (`/auth/login`, `/auth/signup`, `/auth/refresh`) are exempt and rely on SameSite cookies and CORS origin allowlist.
- Passwords: Argon2id with a reasonable default configuration.
- Rate limits: Redis-backed token bucket on `/auth/*` plus per-IP+email throttle on login.
- Email flows: endpoints to issue/confirm verification and password reset tokens (JWT-signed). Wire to an email provider in production.

## Multi-Tenancy & Authorization
- Organizations, Memberships (OWNER/ADMIN/MEMBER).
- Notes are scoped by `organizationId`; access enforced by middleware.
- Choose org via `X-Org-Id` header (defaults to first membership).

## Core API (selected)
- Auth
  - POST `/auth/signup` { email, password } → sets `access_token` + `refresh_token` cookies; returns `{ user }`
  - POST `/auth/login` { email, password } → sets `access_token` + `refresh_token` cookies; returns `{ user }`
  - POST `/auth/refresh` → rotates refresh; sets new cookies
  - POST `/auth/logout` → revokes session; clears cookies
  - GET `/auth/me` → `{ user }`
  - GET `/auth/csrf` → sets CSRF cookie; returns `{ csrfToken }`
  - POST `/auth/verify/request` → `{ token }` (for local testing; integrate email)
  - POST `/auth/verify/confirm` { token }
  - POST `/auth/password/request` { email } → `{ token }` (for local testing)
  - POST `/auth/password/reset` { token, password }
- Orgs
  - GET `/orgs` → list orgs you belong to
  - POST `/orgs` { name } → create org, you are OWNER
  - POST `/orgs/:orgId/invites` { email, role } → create invite (OWNER/ADMIN)
  - POST `/orgs/invites/accept` { token } → accept invite
- Notes (org-scoped; send `X-Org-Id`)
  - GET `/notes`
  - POST `/notes` { title, content }
  - PUT `/notes/:id` { title?, content? }
  - DELETE `/notes/:id`

## Key Backend Files
- `backend/src/app.ts` — security middleware, CORS (with credentials), CSRF, routes, logging
- `backend/src/routes/auth.ts` — JWT access + rotating refresh, Argon2id, verification/reset flows
- `backend/src/routes/orgs.ts` — org CRUD, invites
- `backend/src/routes/notes.ts` — org-scoped CRUD, Redis caching
- `backend/src/middleware/auth.ts` — access JWT validation
- `backend/src/middleware/org.ts` — org context + RBAC
- `backend/src/middleware/csrf.ts` — CSRF utilities
- `backend/src/middleware/rateLimit.ts` — Redis-backed token bucket rate limiter
- `backend/src/lib/redis.ts` — Redis client
- `backend/src/lib/jwt.ts` — JWT helpers (sign/verify access/refresh)
- `backend/src/lib/refreshStore.ts` — refresh session storage/rotation/revocation (Redis)
- `backend/src/config.ts` — environment validation
- `backend/prisma/schema.prisma` — Postgres schema (User, Note, Organization, Membership, Invite)

## Running in Production
- Use managed PostgreSQL (Neon/RDS) and Redis (Upstash/Elasticache).
- Configure a reverse proxy/edge with HTTPS and forward trusted `X-Forwarded-*` headers.
- Set `CORS_ORIGIN` to your frontend domain; cookies require the same site to work cross-origin only if configured properly.
- Add an email provider (e.g., Resend, SendGrid) to send verification and reset links.
- Consider pgBouncer for pooling, autoscaling the API, central logging/metrics.

## Notes
- Cookies are the source of truth... the frontend does not store tokens in localStorage.
- CSRF is required for all mutating requests (non-auth); Axios will fetch `/auth/csrf` automatically if needed.

## What changed in this update
- Switched from server-side Redis sessions to stateless access JWTs with rotating refresh tokens in Redis, enabling horizontal scaling without sticky sessions.
- Added `User.tokenVersion` for global token invalidation and new DB indexes for multi-tenant queries at scale.
- Added Redis-backed rate limiter for auth routes; kept per-IP+email login throttling.
- Hardened `/healthz` to validate Postgres and Redis connectivity.
- Enabled `trust proxy` to support TLS termination at a load balancer/edge.

