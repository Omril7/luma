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

## 2026-06-18 — M1.23: Admin auth + shell

- **Done:** Full admin panel shell, login page, and route guard.
  - `src/stores/adminStore.ts` — Zustand persist store (`luma-admin` key) holding JWT token + email; `setAuth` / `clearAuth`.
  - `src/features/admin/AdminShell.tsx` — Client component: post-hydration route guard (redirects to `/admin/login` when no token); fixed sidebar (RTL, start-0 = right side) with 8 nav items + `motion` stagger entrance; sticky top header showing current page name; logout + storefront link in sidebar footer.
  - `src/app/(admin)/layout.tsx` — New route group **outside** `[lang]` so admin lives at `/admin/...` with no locale prefix; wraps everything with `AdminShell`.
  - `src/app/(admin)/admin/login/page.tsx` — Standalone Hebrew login form (no sidebar); email + password (show/hide toggle); loading + error state; redirects to `/admin` if already authenticated.
  - `src/app/(admin)/admin/page.tsx` — Dashboard page: 7-card quick-link grid linking to all admin sections.
  - Old `[lang]/(admin)/layout.tsx` left as passthrough (no pages under it).
- **Roadmap:** M1.23 ✅
- **Decisions:**
  - Admin is moved to `app/(admin)/` (outside `[lang]`) so URLs are `/admin/...` — no locale prefix needed since admin is Hebrew-only.
  - Hebrew strings hardcoded in admin components — no next-intl for admin (admin doesn't go through `[lang]/layout.tsx`).
  - Route guard runs client-side after Zustand rehydration to avoid SSR/localStorage mismatch; shows spinner during rehydration.
  - Active nav item uses `bg-secondary text-primary` (avoids `bg-primary/10` which doesn't work cleanly with CSS-variable colors in Tailwind v3).
- **Notes:** `typecheck` + `lint` pass clean (zero errors). Next: M1.24 Products CRUD UI.

## 2026-06-18 — M1.19 + M1.20: Checkout + Order Confirmation pages

- **Done:** Full checkout flow and order confirmation.
  - Extended `checkout` namespace in `he.json` / `en.json`: 23 new keys (`street`, `city`, `installments`, `installmentsOne`, `installmentsN`, `notes`, `notesPlaceholder`, `shippingCost`, `freePickup`, `required`, `invalidEmail`, `invalidPhone`, `processing`, `backToCart`, `summary`, `subtotal`, `shippingLabel`, `discountLabel`, `totalLabel`, `emptyCart`, `emptyCartCta`, `termsRequired`, `errorGeneral`).
  - Added new `confirmation` namespace: 14 keys (`title`, `subtitle`, `orderNumber`, `items`, `subtotal`, `shipping`, `discount`, `total`, `delivery`, `deliveryTime`, `home`, `shop`, `notFound`, `free`).
  - `src/app/[lang]/(storefront)/checkout/page.tsx` — Server Component with locale-aware metadata; renders `<CheckoutClient>`.
  - `src/features/checkout/CheckoutClient.tsx` — Client Component: empty-cart guard; customer-info section (name/email/phone with `aria-invalid`/`aria-describedby` error associations); shipping radio-cards (NATIONAL_SHIPPING/PICKUP) with `AnimatePresence` height-reveal for address fields; installments pill selector (1/3/6/12); notes textarea + terms checkbox; live order-summary sidebar (dynamic shipping cost ₪150/Free based on method choice); full client-side validation with first-error focus; `api.post('/api/orders')` → `clear()` + `router.push` to confirmation.
  - `src/app/[lang]/(storefront)/order-confirmation/[id]/page.tsx` — Server Component; calls `getOrderById(id)` directly; metadata from confirmation namespace.
  - `src/features/checkout/ConfirmationClient.tsx` — Client Component: not-found guard; success icon + heading; order-number badge (monospace); per-item list (qty × unit price = total); totals summary (subtotal/shipping/discount/total); delivery estimate with clock icon; CTAs to `/` and `/shop`.
- **Roadmap:** M1.19 ✅ M1.20 ✅
- **Decisions:**
  - `formatPrice` in `ConfirmationClient` takes raw ₪ decimal (OrderDTO prices) — does NOT divide by 100, unlike `CartClient`/`CheckoutClient` which take agorot.
  - Shipping cost for the checkout sidebar is computed client-side (15000 agorot = ₪150) matching the server's hardcoded value in `orderService`; reactive to `form.shippingMethod`.
  - Installments limited to [1, 3, 6, 12] — matching credit-card processor norms for IL; full range is 1–36 per schema.
- **Notes:** `tsc --noEmit` passes clean. RTL audit: zero `pl-/pr-/ml-/mr-/left-/right-` usages; zero hardcoded hex in checkout feature.

## 2026-06-18 — M1.6 + M1.18: Orders/coupons backend + Cart page

- **Done:** Full orders & coupons backend (M1.6) and cart page UI (M1.18).
  - `src/server/services/orderService.ts`: `validateCoupon`, `createOrder`, `getOrderById`. Server recomputes all item prices via `pricingService`; coupon `usedCount` incremented atomically after order creation.
  - `src/app/api/coupons/validate/route.ts`: POST, rate-limited 30/min.
  - `src/app/api/orders/route.ts`: POST, rate-limited 10/min, returns 201.
  - `src/app/api/orders/[id]/route.ts`: GET by id, 404-safe.
  - `src/app/[lang]/(storefront)/cart/page.tsx`: Server Component with locale-aware metadata.
  - `src/features/cart/CartClient.tsx`: Empty state (fade-in, CTA to /shop); item list with AnimatePresence exit; quantity stepper; coupon input with validate API integration; sticky order summary sidebar; checkout CTA.
  - Added 12 new i18n keys to `cart` namespace in both `he.json` and `en.json`.
- **Roadmap:** M1.6 ✅ M1.18 ✅
- **Decisions:**
  - Shipping cost hardcoded at ₪150 for NATIONAL_SHIPPING (Settings UI is M1.28; hardcoded is fine for now).
  - Cart-level coupon validation skips per-customer and first-order-only checks (those need email + order history — full check happens in `createOrder` at checkout).
  - Coupon subtotal passed to API in ₪ (divide agorot by 100); returned discountAmount multiplied back to agorot before `setCoupon`.
  - `redirect /` → `/he` added to `next.config.ts` redirects for direct root-path visits.
- **Notes:** `tsc --noEmit` passes clean. Next step: M1.19 Checkout page.

## 2026-06-17 — M1.17: Product Detail page (core experience)

- **Done:** Full Product Detail page with live custom-price calculator.
  - Added new keys to `product` namespace in `he.json` / `en.json`: `category.*`, `fromPrice`, `estimatedPrice`, `standardSizes`, `customDimensionsToggle`, `customDimensionsLabel`, `cm`, `minHint`, `maxHint`, `colorLabel`, `addedToCart`, `relatedProducts`, `prevImage`, `nextImage`, `imageN`, `enterDimensions`, `priceErrorMin/Max/General`, `dimensionWidth/Height/Depth`, `wishlistAdd/Remove`, `decreaseQuantity`, `increaseQuantity`.
  - `src/app/[lang]/(storefront)/product/[slug]/page.tsx` — Server Component; calls `getProductBySlug` + `getProducts` (same-category related, exclude self); `generateMetadata` with bilingual title/desc/OG image.
  - `src/features/products/ImageGallery.tsx` — Client Component: `AnimatePresence` fade on image change gated on `shouldAnimate`; thumbnail strip (desktop, `md:grid`); dot indicators (mobile, `md:hidden`); prev/next arrow buttons at `start-2`/`end-2` with ≥44px touch targets; furniture SVG placeholder when no images; all i18n labels.
  - `src/features/products/ProductDetail.tsx` — Client Component:
    - `useMemo` price computation using `calculatePrice` from `@/shared/pricing` with proper ₪→agorot conversion; catches `PricingError` for per-dimension bound messages; basePrice fallback for variant-less products.
    - `IntersectionObserver` on the main CTA button drives the sticky mobile bar visibility.
    - Variant pills with `aria-pressed`, custom toggle (`role="switch"` + `aria-checked`), animated dimension inputs (`AnimatePresence` height reveal).
    - Color swatches use `style={{ backgroundColor }}` (only acceptable inline hex — dynamic data).
    - Quantity stepper with `aria-live` on count display.
    - `addedFeedback` state drives green check state on the CTA for 2 s.
    - Wishlist button uses `useWishlistStore`.
    - Toast uses `addToast({ type: 'success', message })` — locale-selected string.
    - Sticky mobile bar: `fixed bottom-0 start-0 end-0 md:hidden` with `pb-[env(safe-area-inset-bottom,12px)]`.
    - Related products grid (2-col mobile / 4-col desktop) via `ProductCard`.
- **Roadmap:** M1.17 ✅
- **Decisions:**
  - `uiStore` toast accepts `{ type, message: string }` — used locale to build the message string at call site.
  - When custom mode is on and no dimensions entered, show `enterDimensions` hint in the price box (not an error `role="alert"`) — this avoids noise on first toggle.
  - `translate-x-5` on toggle thumb kept as physical transform — standard across locales for this small UI element; RTL container positioning makes the overall toggle read correctly.
  - `useCallback` on `handleAddToCart` to avoid unnecessary re-renders when sticky bar mounts.
- **Notes:** `npm run typecheck` and `npm run lint` both pass clean. Zero physical CSS properties.

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
