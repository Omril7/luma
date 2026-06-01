# 10 — DevOps, Config & Storage

## Environments (decided)

- **Framework:** **Next.js (App Router)** as a **single app at the repo root** (UI + API in one
  project). No workspaces/monorepo — framework-free code lives in `src/shared/`.
- **Database:** **Supabase Postgres** in both environments — a separate **Supabase dev
  project** for local development, and a Supabase prod project for production. (Local Docker
  Postgres is kept only as an optional offline fallback.)
- **File storage:** local-disk provider in dev; **Cloudinary** (`STORAGE_DRIVER=cloudinary`)
  in production — chosen for on-the-fly responsive/optimized image delivery (the storefront is
  image-led and mobile-first). Note Vercel's filesystem is **ephemeral**, so prod cannot use
  local disk regardless.
- **Deploy:** Vercel, natively as a Next.js project (see "Production deployment — Vercel").

## Docker (dev)

> With dev pointing at a Supabase dev project, the compose **`db`** service below is an optional
> offline fallback — day-to-day dev can run just the `app` against Supabase.

`docker-compose.yml` brings up:

```
db      postgres:16        → :5432   (volume for persistence)
app     node (Next.js)     → :3000   (UI + /api on one port; depends_on db healthy)
```

- A `postgres` volume persists data across restarts.
- The `web` service waits for the DB healthcheck before starting.

## Production deployment — Vercel

Production runs on **Vercel**, which is Next.js's native platform — one project, no custom
serverless wrapper.

- **App:** import the repo (project root = repo root). Vercel detects Next.js
  and builds it. App Router pages are statically rendered or server-rendered as appropriate;
  Route Handlers (`app/api/**`) run as serverless/edge functions automatically. No `vercel.json`
  rewrites are needed for routing — the App Router handles it.
- **Same origin:** UI and API are served from the same deployment/domain, so there is no CORS or
  API base-URL juggling between them.
- **Database:** **Supabase** (managed Postgres). Use Supabase's connection **pooler** for the app
  and the **direct** connection for migrations:
  - `DATABASE_URL` → pooled (port `6543`, transaction mode) **with `?pgbouncer=true`** appended
    so Prisma disables prepared statements (required for transaction-mode pooling on serverless).
  - `DIRECT_URL` → direct connection (port `5432`) for `prisma migrate` / introspection.
  - In `schema.prisma`, set `datasource db { url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }`.
  - **Reuse a single Prisma client across invocations** via a global singleton
    (`src/server/prisma.ts`) — serverless cold starts otherwise open connection storms.
    Consider Prisma Data Proxy / a pooled connection (PgBouncer) for serverless Postgres.
  - We use Supabase **only as Postgres** — not Supabase Auth/RLS/auto-APIs. The app goes through
    Prisma + our Route Handlers + JWT admin auth.
- **Uploads / storage:** the serverless filesystem is **ephemeral** — `LocalStorageProvider`
  will not persist in production. Production must use the **Cloudinary** `StorageProvider`
  (`STORAGE_DRIVER=cloudinary`). Local dev can stay on `local`. (See "Storage abstraction".)
  `next/image` handles responsive delivery on top.
- **Env vars:** set every var from `.env.example` in the Vercel dashboard (Production +
  Preview). Never commit secrets. `NEXT_PUBLIC_*` vars are inlined into the client bundle at
  build time.
- **Migrations:** run `prisma migrate deploy` against the production DB as a release/CI step
  (e.g. Vercel build command or a CI job) — not at request time. Seed only intentionally.

> Implication for phase 1: keep all DB access and secrets inside `src/server/**` (route
> handlers + server components), keep storage behind `StorageProvider`, and keep the Prisma
> client a singleton, so the Vercel switch is config-only.

## Environment variables

Document **every** required var in `.env.example` (committed, with placeholders). Never commit
real secrets.

```dotenv
# --- database (Supabase) ---
# App: pooled connection (port 6543, transaction mode) + ?pgbouncer=true for Prisma on serverless
DATABASE_URL=postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
# Migrations: direct connection (port 5432)
DIRECT_URL=postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres
# (Local-only alternative for docker dev: postgresql://eden:eden@localhost:5432/eden?schema=public)

# --- app (Next.js — serves UI + /api route handlers on one origin) ---
PORT=3000
NODE_ENV=development
JWT_SECRET=change-me
JWT_EXPIRES_IN=2h
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# --- admin seed user ---
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me

# --- payments (phase 2; stub now) ---
PAYMENT_PROVIDER=stub        # stub | meshulam | tranzila | payplus
PAYMENT_API_KEY=
PAYMENT_API_SECRET=

# --- storage ---
STORAGE_DRIVER=local         # local | cloudinary
UPLOAD_DIR=./uploads
CLOUDINARY_URL=

# --- business / frontend (NEXT_PUBLIC_* are exposed to the browser at build time) ---
NEXT_PUBLIC_WHATSAPP_NUMBER=972500000000
NEXT_PUBLIC_DEFAULT_LANGUAGE=he

# --- email (phase 2) ---
EMAIL_PROVIDER=none          # none | sendgrid | smtp
EMAIL_FROM=
```

## Storage abstraction

`StorageProvider` interface (mirrors the payments approach), in `src/server/providers/`:

```ts
interface StorageProvider {
  save(file: UploadFile): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
}
```

- `LocalStorageProvider` writes to `UPLOAD_DIR` and serves from `/uploads` (a static route /
  public dir in dev). Dev only — the serverless FS is ephemeral.
- `CloudinaryStorageProvider` (phase 2) implements the same interface. Selected by
  `STORAGE_DRIVER`. Call sites (`POST /api/admin/upload`) never change.

## npm scripts (single root `package.json`)

```jsonc
{
  "dev":        "next dev",                 // Next.js dev server (UI + /api) on :3000
  "build":      "next build",
  "start":      "next start",
  "typecheck":  "tsc --noEmit",
  "lint":       "next lint",                // eslint-config-next (flat config also fine)
  "format":     "prettier --write .",
  "test":       "vitest run",               // includes src/shared/*.test.ts
  "db:migrate": "prisma migrate dev",       // wired in M1.1
  "db:seed":    "prisma db seed",            // wired in M1.2
  "db:studio":  "prisma studio"              // wired in M1.1
}
```

## Security baseline

- Sanitize/validate all inputs with Zod (shared schemas) inside route handlers.
- Parameterized queries via Prisma (no raw string SQL).
- Security headers via `next.config.ts` `headers()` (CSP, HSTS, X-Content-Type-Options, …).
- Rate-limit public write endpoints (orders, contact, newsletter, apply-coupon,
  calculate-price) in the route-handler helpers.
- JWT secrets and all credentials from env only; never imported into client components.
- File uploads: validate MIME/size; store via `StorageProvider` with safe names.

## Tooling

- TypeScript strict mode across the app (single `tsconfig.json`).
- ESLint (flat config) + Prettier; `lint-staged` + a husky pre-commit hook for format+lint.
- See `11-testing-quality.md` for test runners and CI.
