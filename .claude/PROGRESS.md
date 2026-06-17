# PROGRESS LOG — Luma

Chronological journal of meaningful work. **Newest entries on top.** This complements
`ROADMAP.md`: the roadmap holds _planned_ work + checkboxes; this log records _what actually
happened, when, and any decisions/caveats_. When you land work: append an entry here **and**
check the matching boxes in `ROADMAP.md`.

## Entry format

```
## YYYY-MM-DD — <short title>
- **Done:** what shipped (files/areas).
- **Roadmap:** milestone(s) touched, e.g. M0.2 ✅ / M1.16 in progress.
- **Decisions:** any choices made (and why).
- **Notes/blockers:** follow-ups, risks, TODOs.
```

Keep entries short and factual. One entry per working session (or per merged change) is plenty.

---

## 2026-06-17 — Backend core: M1.1 → M1.5 complete

- **Done:** Full backend core up through the public catalog API.
  - M1.1: First Prisma migration (`init`) applied against Supabase; all tables created; Prisma Client generated. Fixed `db:migrate` script — Prisma 6 reads `.env`, not `.env.local`.
  - M1.2: Full seed in `prisma/seed.ts` — 4 products (TABLE/SHELF/NIGHTSTAND/TV_STAND) each with S/M/L variants + CustomPricingRule + color options + images; 6 coupons covering every type (permanent, first-order, deadline, one-time, per-customer, auto-apply); 5 newsletter subscribers; admin user (`admin@luma.co.il / LumaAdmin2026!`); email settings; 6 SiteContent blobs (home hero, story, about, contact, FAQ, gallery intro).
  - M1.3: `src/server/http/index.ts` extended with `withApi` (generic error-catching wrapper) and `checkRateLimit` (in-memory, IP-keyed, per-window). Security headers already in `next.config.ts`. `placehold.co` added to image remote patterns for dev placeholder images.
  - M1.4: `src/server/services/pricingService.ts` — loads product+variants+rule via `productService`, converts DB Decimal ₪ → agorot for the engine, calls `src/shared/pricing.ts`, returns `PriceResponseDTO` with both agorot and display ₪ values. PricingError surfaces as 422 with structured details.
  - M1.5: Public catalog endpoints live:
    - `GET /api/products` — filters (category, featured), sort (5 keys), pagination (page/limit)
    - `GET /api/products/:slug` — full ProductDTO by slug
    - `GET /api/categories` — active categories with product counts
    - `POST /api/products/:slug/calculate-price` — validates + computes price; rate-limited 60 req/min
  - All endpoints smoke-tested against live Supabase data.
- **Roadmap:** M1.1 ✅ M1.2 ✅ M1.3 ✅ M1.4 ✅ M1.5 ✅
- **Decisions:**
  - Rate field `pricePerCm*` stored in DB as ₪/cm (consistent with all other money fields); pricingService multiplies by 100 to get agorot/cm for the engine.
  - Dynamic-param route handlers (`[slug]`) use inline try/catch instead of `withApi` wrapper (Next.js App Router passes a context arg `withApi` doesn't accept).
  - Relaxed `variantId` schema from `.cuid()` to `.min(1)` — seed uses readable IDs; actual variant-existence check happens inside the pricing engine.
- **Notes:** `GET /api/products?category=TABLE&sort=price_asc&page=1&limit=12` and all variant patterns confirmed working.

---

## 2026-06-12 — Phase 0 scaffold: M0.1 + M0.2 complete

- **Done:** Full Phase 0 scaffold shipped.
  - M0.1: `package.json` (all scripts), `tsconfig.json` (strict), `next.config.ts` (with next-intl + security headers), Tailwind v3, ESLint flat config, Prettier, lint-staged + husky pre-commit, `.env.example`, `.gitignore`, `README.md`. Folder structure per `01-architecture.md` — all directories created with stub implementations.
  - M0.2: `src/shared/constants.ts`, `types.ts`, `pricing.ts` (full algorithm), `schemas/index.ts` (7 Zod schemas), `pricing.test.ts` (17 tests, all passing). Route handler `GET /api/health` imports from `@/shared` to prove wiring.
  - Bonus: Full Prisma schema (all models from `02-data-models.md`), server provider stubs (storage/email/payment), Zustand store skeletons (cart, ui, language), `useLanguageSwitch` hook, `i18n/navigation.ts` for locale-aware routing.
- **Roadmap:** M0.1 ✅ M0.2 ✅
- **Decisions:**
  - next-intl v3 locale routing: root `layout.tsx` provides `<html>/<body>` with `suppressHydrationWarning`; `[lang]/layout.tsx` is a pure provider wrapper; `LangUpdater` client component syncs `html.lang/dir` after hydration. This sidesteps the next-intl / Next.js 15 constraint that root layout must own `<html>/<body>`.
  - `NODE_ENV=development` set in the shell causes `next build` to fail with a misleading `<Html>` error. Run build with `NODE_ENV=production` (or unset). Added to `.claude/TODO.md`.
  - Full Prisma schema included in Phase 0 so `prisma generate` runs on `npm install` and types are available for future M1.x work. Seed is a stub placeholder.
- **Notes/blockers:** `db:migrate` requires Supabase credentials in `.env.local` (see TODO.md). `npm run dev` works without a DB — only API routes that query Prisma will fail until credentials are configured.

---
