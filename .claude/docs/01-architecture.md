# 01 — Architecture

## Project layout

**One Next.js app at the repository root** — no monorepo, no workspaces. The App Router serves
both the UI and the API; framework-free shared logic lives in `src/shared/`; server-only backend
code lives in `src/server/`.

```
/
├── src/
│   ├── app/                      # App Router
│   │   ├── layout.tsx            # root layout
│   │   ├── [lang]/               # he|en locale segment — sets <html lang dir>; all UI pages live here
│   │   │   ├── (storefront)/     # home, shop, product/[slug], cart, checkout, about, gallery, …
│   │   │   └── admin/            # admin pages (own layout + auth guard)
│   │   └── api/                  # Route Handlers = the backend (products, orders, admin, …)
│   ├── components/               # Reusable, presentational UI components
│   ├── features/                 # Feature modules: cart/, products/, checkout/, admin/
│   ├── hooks/                    # Custom React hooks (client):
│   │   └── useLanguageSwitch.ts  #   encapsulates locale navigation (see below)
│   ├── stores/                   # Zustand stores (cart, language, ui) — client components
│   ├── i18n/                     # next-intl config + he.json, en.json
│   ├── lib/                      # Client-side helpers:
│   │   ├── api.ts                #   typed API client (error-envelope aware, attaches admin JWT)
│   │   └── utils.ts              #   multi-use utilities: formatCurrency, formatDate, cn(), etc.
│   ├── server/                   # SERVER-ONLY backend internals (never imported by client code):
│   │   ├── prisma.ts             #   shared Prisma client (singleton)
│   │   ├── services/             #   business logic (pricingService, orderService, emailService…)
│   │   ├── providers/            #   PaymentProvider, StorageProvider, EmailProvider (swappable)
│   │   ├── auth/                 #   JWT issue/verify, admin guard helpers
│   │   └── http/                 #   error envelope, Zod validation helpers for route handlers
│   ├── shared/                   # FRAMEWORK-FREE, imported by UI AND API (the "lives once" code):
│   │   ├── pricing.ts            #   pure pricing functions (single source of truth) + pricing.test.ts
│   │   ├── schemas/              #   Zod schemas (orders, products, contact, coupons, etc.)
│   │   ├── constants.ts          #   enums, categories, shipping methods
│   │   └── types.ts              #   shared DTO/types
│   ├── styles/                   # globals.css, Tailwind layer, theme variables
│   └── types/                    # Frontend-only types (component props, store shapes)
├── prisma/                       # schema.prisma, migrations, seed.ts
├── public/
├── next.config.ts
├── tsconfig.json
├── package.json                  # ONE package.json
├── .env.example
└── README.md
```

The `@/*` import alias maps to `src/*`, so shared code is `@/shared/pricing`,
server code is `@/server/services/...`, utilities are `@/lib/utils`, etc.

## Why `src/server/` and `src/shared/` as separate folders?

This is a deliberate separation with an important reason for each:

### `src/shared/` — "runs everywhere"

Pure TypeScript: no React, no Next.js, no Prisma, no Node-only APIs. This code runs
identically in the browser (client components) and on the server (Route Handlers, Server
Components). Two pieces of logic **must** agree between browser and API:

1. **Pricing** — a client component shows a live price preview; the route handler recomputes
   it before saving an order. If they diverge, the customer sees one price and gets charged
   another. Solved by putting the exact same function in `src/shared/pricing.ts`.
2. **Validation** — forms validate in the browser for UX and inside route handlers for safety.
   Same Zod schema, literally the same file, both sides.

If this logic lived in `src/services/` or `src/components/`, there'd be nothing stopping a
developer from accidentally importing a Prisma model next to it, breaking the browser build.

### `src/server/` — "server-only, never in the browser"

Prisma client (DB credentials), JWT secrets, payment keys, email API keys — none of this
must ship to the browser bundle. Next.js tree-shakes based on import chains; if server code
lives mixed with UI code, a stray import will silently bundle secrets to the client.

`src/server/` is enforced by convention, and can be hardened further by adding the
`server-only` npm package to `src/server/prisma.ts` — Next.js then throws a **build error**
if any client component imports it. The boundary is explicit and machine-checkable.

**In short:** `shared/` = safe to run anywhere · `server/` = runs only on the server.
Everything else in `src/` is standard Next.js (app/, components/, hooks/, etc.).

## `src/lib/utils.ts` — multi-use client utilities

`src/lib/utils.ts` is the home for **reusable, non-framework utility functions** used across
multiple files:

```ts
// typical contents
export function formatCurrency(agorot: number, locale: string): string { … }
export function formatDate(date: Date | string, locale: string): string { … }
export function cn(...classes: ClassValue[]): string { … }  // Tailwind class merger
export function slugify(text: string): string { … }
export function truncate(text: string, length: number): string { … }
```

Rules:
- Keep functions pure and side-effect-free.
- If a util needs React or Next.js, it belongs in `src/hooks/` or a feature module instead.
- If it needs Prisma or server secrets, it belongs in `src/server/` instead.

## `src/hooks/useLanguageSwitch` — language navigation hook

A custom hook that encapsulates locale switching so components don't need to know the
internals of next-intl's navigation or the `languageStore`:

```ts
// src/hooks/useLanguageSwitch.ts
export function useLanguageSwitch() {
  const locale = useLocale();            // current locale from next-intl
  const router = useRouter();            // next-intl's locale-aware router
  const setLang = useLanguageStore(…);   // mirrors to languageStore

  const switchTo = (lang: 'he' | 'en') => {
    router.replace({ /* current path */ }, { locale: lang });
    setLang(lang);
  };

  return { locale, switchTo, isHebrew: locale === 'he' };
}
```

Used in the header language switcher and anywhere else that needs to change the locale.
Keeps the locale-switch logic in one place.

## Layering & dependency direction

```
UI (server + client components)  ─┐
API (app/api route handlers)      ├─►  src/shared/   (pure, framework-free TS)
src/server (services)            ─┘
```

- `src/shared/` must stay **framework-free and side-effect-free**. No imports from React, Next,
  Prisma client, or Node-only APIs.
- **One app, two faces.** The app renders the UI (React Server + Client Components) and hosts
  the API (`app/api/**` Route Handlers). There is no separate backend server.
- **Server-only code is isolated** under `src/server/`. Client components must never import it.
- Within the API: `route handler → service → prisma`. Handlers stay thin; logic lives in services.
- Within the UI: `page (RSC) → features/components → stores/hooks → lib (api client) → src/shared`.

## Runtime topology

```
┌──────────────────────────────────────────────┐     Prisma     ┌────────────┐
│  Next.js app                  :3000          │ ─────────────► │ PostgreSQL │
│  ┌──────────────┐   same-origin   ┌─────────┐│                │  (Supabase │
│  │ UI (RSC + CC)│ ───────────────►│ /api/** ││                │  :5432)    │
│  └──────────────┘   fetch /api    └─────────┘│                └────────────┘
└──────────────────────────────────────────────┘
```

UI and API share one origin and one port — no dev proxy, no CORS between them.
Deployed on **Vercel** — see `10-devops.md`.

## Extensibility principles

- **Interface-first for swappable concerns:** payments (`PaymentProvider`), image storage
  (`StorageProvider`), email (`EmailProvider`), living in `src/server/providers/`. Stub or
  minimal implementations now; swap later without touching call sites.
- **Feature modules** group everything for a domain (components, hooks, store slice) under
  `src/features/<name>/` so features can grow independently.
- **Config over hardcoding:** theme tokens, shipping costs, business info all come from CSS
  variables / DB settings / env — never literals in components.
