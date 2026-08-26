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
JWT_EXPIRES_IN=30d

# Admin login is not env-configurable today — prisma/seed.ts creates one fixed admin account
# directly. Rate limiting and a real payment provider are planned (see 09-payments.md /
# security baseline below) but not implemented in code yet — no env vars for either until
# they're actually built; don't add RATE_LIMIT_*/PAYMENT_PROVIDER to Vercel, they're unused.

# --- storage (Cloudinary primary; local = offline dev fallback) ---
STORAGE_DRIVER=cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
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

# --- instagram oEmbed (paste-a-link import) ---
# Not required today — Meta's oEmbed endpoint currently accepts unauthenticated requests.
# Only set this if imports start failing with an "access token required" error.
INSTAGRAM_OEMBED_ACCESS_TOKEN=

# --- analytics ---
# GTM-XXXXXXX; GA4 is configured as a tag inside this GTM container, not in code
# (see .claude/docs/15-analytics.md). Leave unset in dev/preview to avoid polluting prod analytics.
NEXT_PUBLIC_GTM_ID=
# Meta Pixel numeric ID (installed directly via src/components/analytics/MetaPixel.tsx,
# not as a GTM tag — see .claude/docs/15-analytics.md). Leave unset in dev/preview.
NEXT_PUBLIC_META_PIXEL_ID=
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
