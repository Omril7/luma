# CLAUDE.md — Eden Project (Custom Furniture E-Commerce)

> Auto-loaded context for every Claude Code session. Keep this file short; deep detail lives in `.claude/docs/`.

## What we're building

A full-stack e-commerce site for a handmade custom-furniture business. Sells furniture with
standard variants (S/M/L) **and** a custom-dimensions option with auto-calculated pricing.
Bilingual **Hebrew (RTL, default) + English (LTR)**, warm/natural aesthetic, full cart +
credit-card checkout. Evolving project — everything must be **modular and extensible**.

Full original brief: [`read/CLAUDE-CODE-PROMPT.md`](read/CLAUDE-CODE-PROMPT.md).

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite |
| Styling | Tailwind CSS (RTL via logical properties) |
| State | Zustand (cart, language, UI) |
| Routing | React Router v6+ |
| i18n | react-i18next (he + en, RTL/LTR auto-switch) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (**Supabase**) + Prisma ORM |
| Admin auth | JWT |
| Payments | Stubbed `PaymentProvider` interface (Meshulam/Tranzila/PayPlus later) |
| File storage | Local uploads now, Cloudinary-ready (abstracted) |
| Deploy | Docker + docker-compose (dev); **Vercel** (production) |

## Workspace map

```
client/    React frontend (components, pages, layouts, features, hooks, stores, i18n, lib, types, styles)
server/    Express backend (routes, controllers, services, middleware, prisma, types)
shared/    Code shared by client & server — pricing engine + Zod schemas + constants + types
```

See [`.claude/docs/01-architecture.md`](.claude/docs/01-architecture.md).

## Golden rules (do not violate)

1. **Bilingual everywhere.** All content models have `_he` and `_en` fields. No user-facing
   string is ever hardcoded — it comes from a translation file. See `06-i18n-rtl.md`.
2. **Pricing logic lives once.** Pure calculation functions in `shared/pricing.ts`, imported
   by both the client (live preview) and the server (validation). Never duplicate. See
   `03-pricing-engine.md`.
3. **Validation lives once.** Zod schemas in `shared/`, used by client forms and server
   middleware. See `04-api-contract.md`.
4. **RTL-safe CSS.** Use logical properties (`ps-4`, `me-2`, `text-start`) — never `pl-`,
   `mr-`, `text-left`. See `06-i18n-rtl.md` + `07-design-system.md`.
5. **Theme via CSS variables.** All colors/fonts are CSS custom properties so they're
   swappable. No hardcoded hex in components. See `07-design-system.md`.
6. **Mobile-first.** Design for phones first, scale up. Customers browse mostly on mobile.
7. **Money as `Prisma.Decimal`** in DB and computed as integer agorot where helpful in the
   pricing engine — see the decision in `02-data-models.md`. Never use raw JS floats for money.
8. **Phase-2 models exist in phase 1.** `Bundle` and `Review` are in the schema from day one;
   only their UIs are deferred.

## Common commands (once scaffolded)

```bash
# install (root, workspaces)
npm install
# dev (client + server)
npm run dev
# database
npm run db:migrate      # prisma migrate dev
npm run db:seed         # seed sample data
npm run db:studio       # prisma studio
# quality
npm run typecheck
npm run lint
npm run test
# docker
docker compose up
```

> These scripts are defined during `/scaffold`; see `10-devops.md` for the authoritative list.

## Documentation index (`.claude/docs/`)

| Doc | Topic |
|---|---|
| [00-overview](.claude/docs/00-overview.md) | Vision, scope, glossary, phase summary |
| [01-architecture](.claude/docs/01-architecture.md) | Monorepo layout, layering, shared package |
| [02-data-models](.claude/docs/02-data-models.md) | Prisma models, relations, enums, decisions |
| [03-pricing-engine](.claude/docs/03-pricing-engine.md) | The custom-dimension pricing algorithm (core) |
| [04-api-contract](.claude/docs/04-api-contract.md) | REST endpoints, request/response shapes, errors |
| [05-frontend](.claude/docs/05-frontend.md) | Pages, components, routing, Zustand stores |
| [06-i18n-rtl](.claude/docs/06-i18n-rtl.md) | Hebrew/English, RTL switching, translation rules |
| [07-design-system](.claude/docs/07-design-system.md) | Theme tokens, typography, UI, accessibility widget |
| [08-admin-panel](.claude/docs/08-admin-panel.md) | Admin pages, JWT auth, CRUD patterns |
| [09-payments](.claude/docs/09-payments.md) | Stubbed payment interface, IL processors |
| [10-devops](.claude/docs/10-devops.md) | Docker, env vars, scripts, deployment |
| [11-testing-quality](.claude/docs/11-testing-quality.md) | Tests, lint/format, CI, perf/a11y gates |

**Build sequence:** [`.claude/ROADMAP.md`](.claude/ROADMAP.md) (planned work + checkboxes).
**Progress log:** [`.claude/PROGRESS.md`](.claude/PROGRESS.md) (chronological journal — append an
entry whenever meaningful work lands; check the matching roadmap boxes).

## Custom commands & agents

- `/scaffold` — stand up the monorepo from the docs.
- `/new-endpoint <name>` — route + controller + service + Zod + shared types.
- `/new-feature <name>` — full vertical slice (model → API → store → page → i18n keys).
- `/check` — typecheck + lint + test across workspaces.
- Subagents: `backend-builder`, `frontend-builder`, `i18n-auditor`.
