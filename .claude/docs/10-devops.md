# 10 — DevOps, Config & Deployment

## Environments

- **Framework:** Next.js (App Router) — single app at the repo root. UI + API in one project.
- **Database:** **Supabase Postgres** — a Supabase dev project for development, a separate
  Supabase prod project for production. No local Docker Postgres needed.
- **File storage:** **Cloudinary** (primary). Local disk (`STORAGE_DRIVER=local`) is an
  offline-only fallback. Cloudinary is used in both dev and production.
- **Deploy:** **Vercel** — the production and staging platform. No Docker in the deploy pipeline.

## Development setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL, Cloudinary URL, JWT secret
npm run db:migrate            # run migrations against your Supabase dev project
npm run db:seed               # seed sample products, coupons, admin user
npm run dev                   # start Next.js on :3000
```

No Docker required. Supabase gives you a managed Postgres instance — just point
`DATABASE_URL`/`DIRECT_URL` at your dev project.

## Production deployment — Vercel

Production runs on **Vercel** — one project, no custom serverless wrapper.

- **App:** import the repo (project root = repo root). Vercel detects Next.js automatically.
  App Router pages render as RSC/SSR/SSG as appropriate; Route Handlers run as serverless
  functions. No `vercel.json` rewrites needed.
- **Same origin:** UI and API served from the same deployment/domain — no CORS needed.
- **Database:** Supabase Postgres.
  - `DATABASE_URL` → pooled connection (port `6543`, transaction mode) + `?pgbouncer=true`
    so Prisma disables prepared statements (required for serverless).
  - `DIRECT_URL` → direct connection (port `5432`) for `prisma migrate` / introspection.
  - `schema.prisma`: `datasource db { url = env("DATABASE_URL"); directUrl = env("DIRECT_URL") }`
  - Single Prisma client reused via global singleton (`src/server/prisma.ts`) to avoid
    connection storms on cold starts.
- **Uploads / storage:** Cloudinary (`STORAGE_DRIVER=cloudinary`, `CLOUDINARY_URL` set in
  Vercel dashboard). Vercel's filesystem is ephemeral — local storage cannot persist in prod.
- **Migrations:** `prisma migrate deploy` runs as a Vercel build command or CI step before
  each production release.
- **Env vars:** set every var from `.env.example` in the Vercel dashboard (Production +
  Preview). `NEXT_PUBLIC_*` vars are inlined at build time.

## Environment variables

```dotenv
# --- database (Supabase) ---
# Pooled (port 6543) for the app; direct (port 5432) for migrations
DATABASE_URL=postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.<ref>:<password>@<region>.pooler.supabase.com:5432/postgres

# --- app ---
NODE_ENV=development
JWT_SECRET=change-me
JWT_EXPIRES_IN=2h
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

# --- admin seed user ---
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me

# --- payments (stub for now; provider TBD) ---
PAYMENT_PROVIDER=stub

# --- storage (Cloudinary primary; local = offline dev fallback) ---
STORAGE_DRIVER=cloudinary
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
UPLOAD_DIR=./uploads         # used only when STORAGE_DRIVER=local

# --- email (Nodemailer SMTP) ---
EMAIL_PROVIDER=stub          # stub | nodemailer
EMAIL_SMTP_HOST=
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=
EMAIL_SMTP_PASS=
EMAIL_FROM=

# --- delivery distance (OpenRouteService) ---
OPENROUTESERVICE_API_KEY=            # free tier: openrouteservice.org — 2,000 req/day

# --- business / frontend ---
NEXT_PUBLIC_WHATSAPP_NUMBER=972500000000
NEXT_PUBLIC_DEFAULT_LANGUAGE=he
```

## Storage abstraction

`StorageProvider` interface in `src/server/providers/storage/`:

```ts
interface StorageProvider {
  save(file: UploadFile): Promise<{ url: string; key: string }>
  delete(key: string): Promise<void>
}
```

- `CloudinaryStorageProvider` — primary. Uses `CLOUDINARY_URL`. Responsive/optimized delivery
  built-in. Works in both dev and production.
- `LocalStorageProvider` — offline fallback. Writes to `UPLOAD_DIR`, serves from `/uploads`.
  Never use in production.

Selected by `STORAGE_DRIVER`. Call sites (`POST /api/admin/upload`) never change.

## npm scripts (single root `package.json`)

```jsonc
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "typecheck": "tsc --noEmit",
  "lint": "next lint",
  "format": "prettier --write .",
  "test": "vitest run",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio",
}
```

## Security baseline

- Sanitize/validate all inputs with Zod (shared schemas) inside route handlers.
- Parameterized queries via Prisma (no raw string SQL).
- Security headers via `next.config.ts` `headers()` (CSP, HSTS, X-Content-Type-Options).
- Rate-limit public write endpoints (orders, contact, newsletter, apply-coupon, calculate-price).
- JWT secrets and all credentials from env only; never imported into client components.
- File uploads: validate MIME/size; store via `StorageProvider` with safe names.

## Tooling

- TypeScript strict mode across the app (single `tsconfig.json`).
- ESLint (flat config) + Prettier; `lint-staged` + husky pre-commit hook for format+lint.
- `motion` package (`motion/react`, Framer Motion v11+) — production dependency for animations.
- `nodemailer` — production dependency for SMTP email sending.
- See `11-testing-quality.md` for test runners and CI.
