# Luma — Custom Furniture E-Commerce

Full-stack e-commerce site for a handmade custom-furniture business.
Bilingual Hebrew (RTL, default) + English (LTR). Built with Next.js 15, Prisma, Supabase, and Vercel.

## Tech stack

| Layer      | Choice                                                      |
| ---------- | ----------------------------------------------------------- |
| Framework  | Next.js 15 (App Router) + TypeScript                        |
| Styling    | Tailwind CSS (RTL via logical properties)                   |
| State      | Zustand                                                     |
| i18n       | next-intl (he/en, RTL/LTR)                                  |
| Database   | PostgreSQL via Supabase + Prisma ORM                        |
| Payments   | Stubbed `PaymentProvider` (Meshulam/Tranzila/PayPlus later) |
| Animations | motion/react (Framer Motion v11+)                           |
| Storage    | Cloudinary (primary); local disk fallback                   |
| Email      | Nodemailer SMTP; ConsoleEmailProvider in dev                |
| Deploy     | Vercel                                                      |

## Development setup

```bash
npm install                    # installs deps + runs prisma generate
cp .env.example .env           # fill in your Supabase + Cloudinary credentials
npm run db:migrate             # ⚠ runs against the PRODUCTION DB (only additive/safe migrations)
npm run db:seed                # ⚠ also the production DB — skip unless intentional
npm run dev                    # start Next.js on :3000
```

No Docker needed. There is **one** [Supabase](https://supabase.com) database — production.
`DATABASE_URL` / `DIRECT_URL` in `.env` point at it; there is no separate dev database, so
local dev and migrations run against live production data.

## Available scripts

| Script               | Description                       |
| -------------------- | --------------------------------- |
| `npm run dev`        | Start Next.js dev server on :3000 |
| `npm run build`      | Production build                  |
| `npm run start`      | Start production server           |
| `npm run typecheck`  | TypeScript check (no emit)        |
| `npm run lint`       | ESLint check                      |
| `npm run format`     | Prettier format all files         |
| `npm test`           | Run Vitest unit tests             |
| `npm run db:migrate` | Run Prisma migrations (dev)       |
| `npm run db:seed`    | Seed the database                 |
| `npm run db:studio`  | Open Prisma Studio                |

## Project structure

```
src/
  app/         App Router — storefront + admin pages + /api route handlers
  components/  Reusable UI components
  features/    Feature modules (cart, products, checkout, admin)
  hooks/       Custom React hooks
  stores/      Zustand stores (cart, language, ui)
  i18n/        next-intl config + he.json, en.json
  lib/         Typed API client, shared utilities
  server/      Server-only: Prisma client, services, providers, auth, http helpers
  shared/      Framework-free: pricing engine, Zod schemas, constants, DTOs
  styles/      globals.css, Tailwind layers, theme CSS variables
  types/       Frontend-only TypeScript types
prisma/        schema.prisma, migrations, seed.ts
```

## Deployment

Production and staging deploy to **Vercel** — import the repo and set env vars from `.env.example` in the Vercel dashboard. Set `prisma migrate deploy` as a build command.

See `.claude/docs/10-devops.md` for the authoritative deployment guide.
