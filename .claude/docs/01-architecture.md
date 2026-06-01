# 01 — Architecture

## Monorepo layout

A single repository with three workspaces managed by npm/pnpm workspaces.

```
/
├── client/                    # React frontend (Vite)
│   └── src/
│       ├── components/        # Reusable, presentational UI components
│       ├── pages/             # Page-level components (route targets)
│       ├── layouts/           # StorefrontLayout, AdminLayout
│       ├── features/          # Feature modules: cart/, products/, checkout/, admin/
│       ├── hooks/             # Custom React hooks
│       ├── stores/            # Zustand stores (cart, language, ui)
│       ├── i18n/              # he.json, en.json, i18n config
│       ├── lib/               # API client, utils, helpers
│       ├── types/             # Frontend-only types
│       └── styles/            # Global CSS, Tailwind layer, theme variables
├── server/                    # Express backend
│   └── src/
│       ├── routes/            # Route definitions (thin)
│       ├── controllers/       # Request/response handling
│       ├── services/          # Business logic (pricingService, paymentService, emailService)
│       ├── middleware/        # auth, validation, errorHandler, rateLimit
│       ├── prisma/            # schema.prisma, migrations, seed.ts
│       └── types/             # Server-only types
├── shared/                    # Imported by BOTH client and server
│   ├── pricing.ts             # Pure pricing functions (the single source of truth)
│   ├── schemas/               # Zod schemas (orders, products, contact, etc.)
│   ├── constants.ts           # Enums, categories, shipping methods
│   └── types.ts               # Shared DTO/types
├── docker-compose.yml
├── .env.example
└── README.md
```

## Layering & dependency direction

```
client  ─┐
         ├─►  shared   (pure, framework-free TS — no React, no Express, no Prisma client)
server  ─┘
```

- `shared/` must stay **framework-free and side-effect-free**. No imports from React, Express,
  Prisma client, or Node-only APIs. This lets the same code run in the browser and in Node.
- `client/` and `server/` both depend on `shared/`. They never depend on each other.
- Within the server: `routes → controllers → services → prisma`. Routes stay thin; business
  logic belongs in services. Prisma is only touched in services (and seed).
- Within the client: `pages → features/components → stores/hooks → lib (api client) → shared`.

## Why a shared package

Two pieces of logic MUST agree between client and server:

1. **Pricing** — the client shows a live price preview; the server recomputes it to validate
   the order total before saving. If they diverge, customers see one price and get charged
   another. Solved by `shared/pricing.ts`.
2. **Validation** — forms validate on the client for UX and on the server for safety. Same
   Zod schema both places. Solved by `shared/schemas/`.

## Runtime topology (dev)

```
┌────────────┐      HTTP /api      ┌─────────────┐     Prisma     ┌────────────┐
│  client    │ ──────────────────► │  server     │ ─────────────► │ PostgreSQL │
│ Vite :5173 │                     │ Express:3000│                │  :5432     │
└────────────┘                     └─────────────┘                └────────────┘
       ▲                                  │
       └──── static uploads served from  /uploads (local storage abstraction)
```

In dev, Vite proxies `/api` to the Express server. See `10-devops.md` for docker-compose.

## Extensibility principles

- **Interface-first for swappable concerns:** payments (`PaymentProvider`), image storage
  (`StorageProvider`), email (`EmailProvider`). Stub local/no-op implementations now; swap
  later without touching call sites. See `09-payments.md` and `10-devops.md`.
- **Feature modules** on the client group everything for a domain (components, hooks, store
  slice) under `features/<name>/` so features can grow independently.
- **Config over hardcoding:** theme tokens, shipping costs, business info, phone numbers all
  come from CSS variables / settings / env — never literals in components.
