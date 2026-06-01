# 10 — DevOps, Config & Storage

## Environments (decided)

- **Package manager / monorepo:** plain **npm workspaces** (no Turborepo).
- **Database:** **Supabase Postgres** in both environments — a separate **Supabase dev
  project** for local development, and a Supabase prod project for production. (Local Docker
  Postgres is kept only as an optional offline fallback.)
- **File storage:** local-disk provider in dev; **Cloudinary** (`STORAGE_DRIVER=cloudinary`)
  in production — chosen for on-the-fly responsive/optimized image delivery (the storefront is
  image-led and mobile-first).
- **Deploy:** Vercel (see "Production deployment — Vercel" below).

## Docker (dev)

> With dev pointing at a Supabase dev project, the compose **`db`** service below is an
> optional offline fallback — day-to-day dev can run just `server` + `client` against Supabase.

`docker-compose.yml` brings up three services:

```
db      postgres:16        → :5432   (volume for persistence)
server  node (server/)     → :3000   (depends_on db; runs migrate + dev)
client  node (client/)     → :5173   (Vite dev server, proxies /api → server)
```

- A `postgres` volume persists data across restarts.
- The server waits for the DB (healthcheck) before migrating.

## Production deployment — Vercel

Production runs on **Vercel**. Docker/compose stays the local-dev story; Vercel is the deploy
target. Plan the layout so this is smooth:

- **Client (Vite React):** deploys natively on Vercel as a static SPA build. Set the project
  root/output to the `client` workspace; build with `npm -w client run build`, output `dist/`.
  Add a SPA rewrite so client-side routes work:
  ```json
  // vercel.json (client) — rewrite all non-asset routes to index.html
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```
- **Server (Express):** deploy as **Vercel Serverless Functions**. Wrap the Express `app` with a
  serverless handler (e.g. export the app from `server/src/app.ts` and expose it from an
  `api/` entry) so the same app runs locally (listen) and on Vercel (handler). Route
  `/api/*` to the function via `vercel.json` rewrites.
  - Keep handlers stateless; cold starts mean no in-memory session state — JWT auth already
    fits this. Reuse a single Prisma client across invocations (singleton/global) to avoid
    connection storms; consider Prisma Data Proxy / a pooled connection (e.g. PgBouncer) for
    serverless Postgres.
- **Database:** **Supabase** (managed Postgres) is the chosen DB. Use Supabase's connection
  **pooler** for the app and the **direct** connection for migrations:
  - `DATABASE_URL` → pooled (port `6543`, transaction mode) **with `?pgbouncer=true`** appended
    so Prisma disables prepared statements (required for transaction-mode pooling on serverless).
  - `DIRECT_URL` → direct connection (port `5432`) for `prisma migrate` / introspection.
  - In `schema.prisma`, set `datasource db { url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }`.
  - Reuse a single Prisma client across invocations (global singleton) to avoid connection storms.
  - We use Supabase **only as Postgres** — not Supabase Auth/RLS/auto-APIs. The app goes through
    Prisma + our Express API + JWT admin auth.
- **Uploads / storage:** the serverless filesystem is **ephemeral** — `LocalStorageProvider`
  will not persist in production. Production must use the **Cloudinary** `StorageProvider`
  (`STORAGE_DRIVER=cloudinary`). Local dev can stay on `local`. (See "Storage abstraction".)
- **Env vars:** set every var from `.env.example` in the Vercel dashboard (Production +
  Preview). Never commit secrets. `VITE_*` vars are build-time for the client.
- **Migrations:** run `prisma migrate deploy` against the production DB as a release/CI step
  (not at request time). Seed only intentionally.
- **Monorepo wiring:** either one Vercel project per workspace (client + server) or a single
  project with `vercel.json` routing static build + `api/` functions. Decide during the deploy
  milestone (`ROADMAP.md` M1.29).

> Implication for phase 1: keep the Express app exportable (separate `app.ts` from the
> `listen()` bootstrap) and keep storage behind `StorageProvider` so the Vercel switch is
> config-only, not a rewrite.

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

# --- server ---
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
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

# --- business / frontend ---
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WHATSAPP_NUMBER=972500000000
VITE_DEFAULT_LANGUAGE=he

# --- email (phase 2) ---
EMAIL_PROVIDER=none          # none | sendgrid | smtp
EMAIL_FROM=
```

## Storage abstraction

`StorageProvider` interface (mirrors the payments approach):

```ts
interface StorageProvider {
  save(file: UploadFile): Promise<{ url: string; key: string }>;
  delete(key: string): Promise<void>;
}
```

- `LocalStorageProvider` writes to `UPLOAD_DIR` and serves from `/uploads` (Express static).
- `CloudinaryStorageProvider` (phase 2) implements the same interface. Selected by
  `STORAGE_DRIVER`. Call sites (`/api/admin/upload`) never change.

## npm scripts (root, via workspaces)

```jsonc
{
  "dev":        "concurrently \"npm:dev:server\" \"npm:dev:client\"",
  "dev:client": "npm -w client run dev",
  "dev:server": "npm -w server run dev",
  "build":      "npm -w shared run build && npm -w server run build && npm -w client run build",
  "typecheck":  "npm -w shared run typecheck && npm -w server run typecheck && npm -w client run typecheck",
  "lint":       "eslint . --ext .ts,.tsx",
  "test":       "npm -w shared run test && npm -w server run test && npm -w client run test",
  "db:migrate": "npm -w server run db:migrate",
  "db:seed":    "npm -w server run db:seed",
  "db:studio":  "npm -w server run db:studio"
}
```

(Exact wiring decided during `/scaffold`; this is the target shape.)

## Security baseline

- Sanitize/validate all inputs with Zod (shared schemas).
- Parameterized queries via Prisma (no raw string SQL).
- `helmet` for headers, CORS locked to `CORS_ORIGIN`.
- Rate-limit public write endpoints (orders, contact, newsletter, apply-coupon,
  calculate-price).
- JWT secrets and all credentials from env only.
- File uploads: validate MIME/size; store outside the served app root or with safe names.

## Tooling

- TypeScript strict mode in all workspaces; shared `tsconfig.base.json`.
- ESLint + Prettier; `lint-staged` + a pre-commit hook (husky or simple) for format+lint.
- See `11-testing-quality.md` for test runners and CI.
