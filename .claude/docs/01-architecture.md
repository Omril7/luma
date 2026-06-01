# 01 — Architecture

## Project layout

**One Next.js app at the repository root** — no monorepo, no workspaces. The App Router serves
both the UI and the API; framework-free shared logic (pricing, validation, types) lives in a
plain `src/shared/` folder that any part of the app can import.

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
│   ├── hooks/                    # Custom React hooks (client)
│   ├── stores/                   # Zustand stores (cart, language, ui) — client components
│   ├── i18n/                     # next-intl config + he.json, en.json
│   ├── lib/                      # API client (for client components), utils, helpers
│   ├── server/                   # SERVER-ONLY backend internals (never imported by client code):
│   │   ├── prisma.ts             #   shared Prisma client (singleton)
│   │   ├── services/             #   business logic (pricingService, orderService, …)
│   │   ├── providers/            #   PaymentProvider, StorageProvider, EmailProvider (swappable)
│   │   ├── auth/                 #   JWT issue/verify, admin guard helpers
│   │   └── http/                 #   error envelope, Zod validation helpers for route handlers
│   ├── shared/                   # FRAMEWORK-FREE, imported by UI AND API (the "lives once" code):
│   │   ├── pricing.ts            #   pure pricing functions (single source of truth) + pricing.test.ts
│   │   ├── schemas/              #   Zod schemas (orders, products, contact, etc.)
│   │   ├── constants.ts          #   enums, categories, shipping methods
│   │   └── types.ts              #   shared DTO/types
│   ├── styles/                   # globals.css, Tailwind layer, theme variables
│   └── types/                    # Frontend-only types
├── prisma/                       # schema.prisma, migrations, seed.ts
├── public/
├── next.config.ts
├── tsconfig.json
├── package.json                  # ONE package.json
├── docker-compose.yml
├── .env.example
└── README.md
```

The `@/*` import alias maps to `src/*`, so shared code is imported as `@/shared/pricing`,
server code as `@/server/services/...`, etc.

## Layering & dependency direction

```
UI (server + client components)  ─┐
API (app/api route handlers)      ├─►  src/shared/   (pure, framework-free TS)
src/server (services)            ─┘
```

- `src/shared/` must stay **framework-free and side-effect-free**. No imports from React, Next,
  Prisma client, or Node-only APIs — it's plain TypeScript that runs in the browser, in server
  components, and in route handlers alike. (It's a folder, not a package: one app means no need
  for a separate workspace to share it.)
- **One app, two faces.** The app renders the UI (React Server + Client Components) and hosts
  the API (`app/api/**` Route Handlers). There is no separate backend server.
- **Server-only code is isolated** under `src/server/` (Prisma, services, providers, auth).
  Client components must never import it — route handlers, server components, and server actions
  do. Keep the boundary clean so secrets/DB access never ship to the browser.
- Within the API: `route handler → service → prisma`. Handlers stay thin (parse + validate +
  delegate + shape the response); business logic and all Prisma access live in services.
- Within the UI: `page (server comp) → features/components → stores/hooks (client) → lib (api client) → src/shared`.

## Why a shared folder

Two pieces of logic MUST agree between the browser and the API:

1. **Pricing** — a client component shows a live price preview; the route handler recomputes it
   to validate the order total before saving. If they diverge, customers see one price and get
   charged another. Solved by `src/shared/pricing.ts`.
2. **Validation** — forms validate in the browser for UX and inside route handlers for safety.
   Same Zod schema both places. Solved by `src/shared/schemas/`.

Keeping these in one place (and free of React/Next/Prisma) is what guarantees parity — the same
function literally runs on both sides.

## Runtime topology

```
┌──────────────────────────────────────────────┐     Prisma     ┌────────────┐
│  Next.js app                  :3000            │ ─────────────► │ PostgreSQL │
│  ┌──────────────┐   same-origin   ┌─────────┐  │                │  (Supabase │
│  │ UI (RSC + CC)│ ───────────────►│ /api/** │  │                │   :5432)   │
│  └──────────────┘   fetch /api    └─────────┘  │                └────────────┘
└──────────────────────────────────────────────┘
        static uploads served from /uploads (local StorageProvider in dev; Cloudinary in prod)
```

UI and API share one origin and one port — no dev proxy, no CORS between them. See
`10-devops.md` for docker-compose and the Vercel deployment.

## Extensibility principles

- **Interface-first for swappable concerns:** payments (`PaymentProvider`), image storage
  (`StorageProvider`), email (`EmailProvider`), living in `src/server/providers/`. Stub
  local/no-op implementations now; swap later without touching call sites. See `09-payments.md`
  and `10-devops.md`.
- **Feature modules** group everything for a domain (components, hooks, store slice) under
  `src/features/<name>/` so features can grow independently.
- **Config over hardcoding:** theme tokens, shipping costs, business info, phone numbers all
  come from CSS variables / settings / env — never literals in components.
