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

## 2026-06-17 — M1.16: Shop / Catalog page

- **Done:** Full shop/catalog page with URL-driven filters, sort, pagination, and empty state.
  - Added `shop` namespace to `he.json` and `en.json` (title, categories, sort keys, results count, empty state, pagination labels).
  - `src/app/[lang]/(storefront)/shop/page.tsx` — Server Component; reads `searchParams` (category, sort, page), validates against allow-lists, calls `getProducts` directly, renders `ShopClient`.
  - `src/features/shop/ShopClient.tsx` — Client Component with:
    - `setParam` helper that writes URL params via `window.location.search` (no `useSearchParams` hook → no Suspense boundary required), then calls `router.push`.
    - Desktop sidebar: vertical category pill list + sort `<select>` with label.
    - Mobile filters: horizontally-scrollable pill row + compact sort `<select>` (flex-shrink-0).
    - Product grid: `motion.div layout` + `AnimatePresence mode="popLayout"` with stagger; all motion gated behind `shouldAnimate = !a11y.reduceMotion`.
    - Empty state: SVG furniture outline, heading, body text, CTA button — all from i18n.
    - Pagination: prev/next buttons with `disabled` + reduced-opacity, RTL-aware chevron rotation (`rotate-90 rtl:-rotate-90`), "Page X of Y" counter from i18n.
    - All touch targets ≥ 44px. All strings via `useTranslations('shop')`. Zero hardcoded hex or `pl-`/`mr-` properties.
  - `generateMetadata` on the page for bilingual `<title>`.
- **Roadmap:** M1.16 ✅
- **Decisions:**
  - Used `window.location.search` in click handlers (not `useSearchParams` hook) to avoid the Next.js requirement to wrap in `<Suspense>` — the client component is interactive only and never reads params during SSR.
  - Pagination chevrons use Tailwind `rtl:` variant (`rotate-90 rtl:-rotate-90`) rather than locale-conditional class to stay CSS-only.
  - `CategoryPill` and `SortSelect` are inner functions inside `ShopClient` (not separate files) — they're tightly coupled to `setParam` and `currentCategory`/`currentSort` from the parent scope, and too small to warrant separate modules.
- **Notes:** `npm run typecheck` and `npm run lint` both pass clean.

## 2026-06-17 — M1.15: Home page

- **Done:** Full home page with 5 sections + shared ProductCard + wishlistStore.
  - `wishlistStore` (Zustand persist, `luma-wishlist` localStorage key, `ids`/`toggle`/`has`/`clear`)
  - `ProductCard` (client, motion hover/tap, next/image fill+sizes, Intl.NumberFormat price, wishlist heart toggle with logical `end-2` positioning)
  - `HeroSection` (min-h-dvh gradient, 2-col desktop, fade+slide entrance, scroll indicator)
  - `FeaturedSection` (2-col mobile / 3-col desktop grid, stagger animations, empty state)
  - `StorySection` (bg-secondary, slide-in from sides, placeholder image + text + CTA)
  - `TestimonialsSection` (3 static placeholder cards, `<blockquote>`, 5-star sr-only)
  - `InstagramSection` (6-tile placeholder grid with camera SVG)
  - Added `home` namespace to he.json and en.json
  - Home page.tsx is Server Component with `generateMetadata` + direct `getProducts` call (no HTTP)
- **Roadmap:** M1.15 ✅
- **Decisions:** Static testimonial data co-located in component (avoids next-intl array complexity). Server Component calls `productService.getProducts` directly (per architecture: SC → service, no HTTP round-trip).

## 2026-06-17 — M1.11–M1.14: Fonts + route groups + storefront shell

- **Done:**
  - M1.11: Added Heebo/Rubik/Inter via `next/font/google`; CSS vars updated to reference injected vars with fallbacks; high-contrast token override block + underline-links rule added to globals.css.
  - M1.12: Created `(storefront)` and `(admin)` route groups under `[lang]/`; deleted conflicting `[lang]/page.tsx`; added i18n keys (header, a11y, whatsapp, footer.tagline/shopLinks/infoLinks) to both he.json and en.json.
  - M1.13: Already complete from scaffold; confirmed `api.ts`, `cartStore`, `uiStore`, `languageStore` all present.
  - M1.14: Built `StorefrontLayout` (server async, skip link + main wrapper), `Header` (client, sticky glassmorphism, scroll shadow, desktop nav, mobile slide-down menu, language switcher pill, cart badge), `Footer` (server, 3-col responsive grid), `WhatsAppButton` (spring-animated, logical start-bottom positioning), `A11yWidget` (draggable via `useDragControls`, font-scale ±0.1 with reset, high-contrast/reduce-motion/underline-links toggles, syncs to HTML data attrs + CSS var), `ToastContainer` (AnimatePresence, type-colour coded).
- **Roadmap:** M1.11 ✅ M1.12 ✅ M1.13 ✅ M1.14 ✅
- **Decisions:**
  - All motion gated behind `a11y.reduceMotion` check (`shouldAnimate` flag).
  - Logical CSS throughout (`start-*`, `end-*`, `ps-*`, `pe-*`, `text-start/end`).
  - `(admin)/layout.tsx` is a passthrough shell — full AdminLayout deferred to M1.23.
  - `lucide-react` installed for SVG icons (ShoppingBag, Menu, X).
- **Notes:** typecheck + lint clean on completion.

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
