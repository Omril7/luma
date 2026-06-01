# ROADMAP — Eden Project

Ordered, checkbox-driven build plan. Check items off as they land. Each milestone has an
**Acceptance** line. Deep detail for any topic lives in `.claude/docs/`. The build is
sequenced so the **Product Detail page with the live custom-price calculator** (the brief's
stated priority) is reachable as early as possible.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done. Phase-2 items are built later but their
**models exist from phase 1**.

> **Tracking:** check boxes here as work lands, **and** append a dated entry to
> `.claude/PROGRESS.md` (the chronological journal — what happened, decisions, blockers).
> **Deployment target:** Vercel (see `docs/10-devops.md` → "Production deployment — Vercel").

---

## Phase 0 — Foundations

### M0.1 App scaffold (single root Next.js)
- [ ] Create the Next.js app (App Router, TS, `src/`, `@/*` → `src/*`) at the repo root
- [ ] Root `package.json` scripts (see `docs/10-devops.md`)
- [ ] `tsconfig.json` (strict) — single, project-wide
- [ ] ESLint + Prettier + lint-staged + husky pre-commit hook
- [ ] `.env.example` with all vars; `.gitignore`; `README.md`
- [ ] `docker-compose.yml` (db + app)
- **Acceptance:** `npm install` works; `npm run dev` starts the app (UI + `GET /api/health`); `next build` passes.

### M0.2 Shared logic (`src/shared/`)
- [ ] `src/shared/constants.ts` (Category, ShippingMethod, statuses, etc.)
- [ ] `src/shared/types.ts` (DTOs shared by UI/API)
- [ ] `src/shared/pricing.ts` (engine per `docs/03-pricing-engine.md`)
- [ ] `src/shared/schemas/` (Zod: order, contact, newsletter, price-request, admin login)
- [ ] `src/shared/pricing.test.ts` (full coverage — see `docs/11-testing-quality.md`)
- **Acceptance:** pricing unit tests pass; `src/shared/` stays framework-free and imports cleanly from UI and route handlers.

---

## Phase 1 — Backend core

### M1.1 Database schema
- [ ] `prisma/schema.prisma` with **all** models (incl. Bundle, Review) per `docs/02-data-models.md`
- [ ] First migration; Postgres running via docker
- [ ] Prisma client generated
- **Acceptance:** `npm run db:migrate` succeeds; `db:studio` shows all tables.

### M1.2 Seed data
- [ ] `prisma/seed.ts`: 3–4 products across categories, each w/ S/M/L variants, a pricing rule, 2–3 colors, multiple images (bilingual)
- [ ] A couple of coupons; a few newsletter subscribers; seeded admin user
- **Acceptance:** `npm run db:seed` populates a browsable catalog in he + en.

### M1.3 API foundation (Route Handlers)
- [ ] `src/server/http/` helpers: `withApi`/`withAdmin` wrappers, error-envelope mapping (`docs/04-api-contract.md`)
- [ ] Zod validation helper; rate limiter for public writes; security headers in `next.config.ts`
- [ ] Prisma client singleton (`src/server/prisma.ts`); `/uploads` serving
- **Acceptance:** `GET /api/health` returns 200; bad input returns the error envelope.

### M1.4 Pricing service
- [ ] `services/pricingService.ts` loads product+variants+rule, calls `src/shared/pricing.ts`
- **Acceptance:** server price matches client preview for the same inputs (parity test).

### M1.5 Public catalog endpoints
- [ ] `GET /products` (filters/sort/paginate), `GET /products/:slug`, `GET /categories`
- [ ] `POST /products/:id/calculate-price`
- **Acceptance:** endpoints return seeded data; calculate-price validates + computes correctly.

### M1.6 Orders & coupons
- [ ] `POST /orders` (server recomputes all line prices + totals, persists snapshot)
- [ ] `GET /orders/:id`; `POST /orders/:id/apply-coupon` (validity + limits)
- **Acceptance:** an order created from a custom-dimension cart stores correct authoritative totals; coupon math correct.

### M1.7 Misc public endpoints
- [ ] `POST /contact`, `POST /newsletter/subscribe`, `GET /gallery`, `GET /reviews/:productId`, `GET /faq`
- **Acceptance:** each validates input and persists/returns as specified.

### M1.8 Admin auth + CRUD
- [ ] `POST /admin/auth/login` (JWT, hashed password), `auth` middleware on `/admin/*`
- [ ] CRUD: products (+variants, pricing rule, colors, images), orders (status updates), coupons
- [ ] CRUD: gallery, faq, settings, newsletter (list + CSV export)
- [ ] Endpoints for bundles + reviews (UI later)
- [ ] `GET /admin/dashboard/stats`
- **Acceptance:** admin token required; full product lifecycle manageable via API.

### M1.9 Storage abstraction
- [ ] `StorageProvider` + `LocalStorageProvider`; `POST /admin/upload`
- **Acceptance:** uploaded image returns a served URL usable on a product.

---

## Phase 1 — Frontend core

### M1.10 App setup
- [ ] Next.js App Router + TS (scaffolded); add Tailwind w/ logical properties + token mapping
- [ ] `styles/globals.css` + theme CSS variables (`docs/07-design-system.md`); fonts (Heebo/Rubik + Latin) via `next/font`
- **Acceptance:** themed blank app renders; changing a CSS var re-skins it.

### M1.11 i18n + RTL + layouts
- [ ] next-intl; `[lang]` locale segment; `he.json`/`en.json`; default he/RTL
- [ ] `[lang]/layout.tsx` sets `<html lang dir>`; `languageStore` mirrors locale for client widgets
- [ ] `StorefrontLayout` + `AdminLayout` via App Router `layout.tsx`
- **Acceptance:** switching locale flips direction and all UI strings; no hardcoded text.

### M1.12 API client + stores
- [ ] `lib/api.ts` (typed, error-envelope aware, attaches admin JWT)
- [ ] `cartStore` (persisted, uses `src/shared/pricing.ts`), `uiStore` (toasts, a11y prefs)
- **Acceptance:** cart math correct and persists across reload.

### M1.13 Storefront shell
- [ ] Header (logo, nav, language switcher, cart badge), footer
- [ ] Floating WhatsApp button (logical positioning, env number)
- [ ] Accessibility widget (font scale, contrast) — `docs/07-design-system.md`
- **Acceptance:** shell responsive + RTL-correct; a11y widget changes the page.

### M1.14 Home page
- [ ] Hero + CTA, featured products grid, Our Story teaser, testimonials + Instagram placeholders
- **Acceptance:** featured products load from API; mobile-first layout.

### M1.15 Shop / catalog
- [ ] Category filter, sort (price/newest/name), responsive cards ("from ₪X")
- **Acceptance:** filtering/sorting hit the API and update the grid.

### M1.16 ⭐ Product Detail (CORE)
- [ ] Image gallery (swipeable mobile)
- [ ] Variant selector (S/M/L with dims)
- [ ] Custom-dimensions toggle + width/height/depth inputs with min/max constraints
- [ ] **Live price** via `src/shared/pricing.ts` (optional debounced server confirm)
- [ ] Color/finish swatches, quantity, Add to Cart, related products
- **Acceptance:** typing custom dimensions updates the price instantly and matches the server; add-to-cart carries the correct snapshot. *(Depends on M0.2, M1.5.)*

### M1.17 Cart
- [ ] Items (thumbnails, variant/custom info), qty +/-, coupon input
- [ ] Subtotal / shipping estimate / discount / total; checkout CTA
- **Acceptance:** coupon applies via API; totals correct.

### M1.18 Checkout
- [ ] Customer info form, shipping-vs-pickup, order summary sidebar
- [ ] "Pay with Credit Card" (stub), installments selector, terms checkbox
- [ ] Create order → stub payment flow
- **Acceptance:** completing checkout creates an order and routes to confirmation.

### M1.19 Order confirmation
- [ ] Thank-you, order number, summary, delivery timeframe (by `:id`)
- **Acceptance:** confirmation reflects the persisted order.

### M1.20 Static pages
- [ ] About, Gallery (masonry + lightbox), Contact (form + WhatsApp + hours), FAQ (accordion)
- [ ] Legal: terms / privacy / returns (bilingual placeholder content)
- **Acceptance:** all render bilingually; contact + newsletter submit successfully.

### M1.21 SEO + performance
- [ ] Next Metadata API per-page meta (bilingual, correct lang); product-specific metadata
- [ ] Server Components + automatic code-splitting; `next/image` lazy-loading; bundle check
- **Acceptance:** Lighthouse pass on Home + Product (perf/a11y/SEO).

---

## Phase 1 — Admin panel

### M1.22 Admin auth + dashboard
- [ ] Login page + route guard; `AdminLayout` nav
- [ ] Dashboard: order count, revenue, recent orders
- **Acceptance:** unauthenticated users redirected; dashboard shows real stats.

### M1.23 Products CRUD UI
- [ ] List + edit; manage variants, pricing rule, colors, image upload, active/featured/sort
- **Acceptance:** can create a customizable product end-to-end and see it on the storefront.

### M1.24 Orders management
- [ ] List + filter by status; detail; update order/payment status
- **Acceptance:** status changes persist and reflect on the order.

### M1.25 Coupons management
- [ ] CRUD + activate/deactivate; limits/usage
- **Acceptance:** a created coupon works at cart.

### M1.26 Remaining admin
- [ ] Newsletter list + CSV export; Settings (business info, shipping, WhatsApp); Gallery mgmt (basic)
- [ ] Bundles + Reviews **page shells** (routes + placeholder)
- **Acceptance:** nav complete; settings drive storefront (e.g. shipping cost, WhatsApp number).

---

## Phase 1 — Hardening / launch readiness

### M1.27 Quality pass
- [ ] Toasts for all API success/error; form validation messages bilingual
- [ ] Security pass: sanitize, CORS, rate limits, upload validation, JWT expiry
- [ ] Responsive QA (mobile-first) + RTL QA (logical properties only)
- [ ] Accessibility QA (keyboard, labels, contrast, widget)
- **Acceptance:** all golden-rule gates in `docs/11-testing-quality.md` pass.

### M1.28 Tests
- [ ] Pricing unit tests green; key route-handler tests (Vitest, mocked requests)
- [ ] Playwright smoke: browse → custom price → cart → checkout (stub) → confirmation
- **Acceptance:** CI-style `typecheck + lint + test + build` all green.

### M1.29 Deploy to Vercel
- [ ] Import repo as a Next.js project (root = `web`); UI + `app/api` deploy together (no custom wrapper / `vercel.json` routing)
- [ ] Supabase Postgres; pooled `DATABASE_URL` (`?pgbouncer=true`) + direct `DIRECT_URL`; single Prisma client reused
- [ ] `STORAGE_DRIVER=cloudinary` in prod (serverless FS is ephemeral); all env vars set in Vercel
- [ ] `prisma migrate deploy` as a release step
- **Acceptance:** Preview + Production deployments serve the storefront and `/api`; uploads persist via Cloudinary. *(See `docs/10-devops.md`.)*

---

## Phase 2 — Post-launch

- [ ] **Payments:** integrate Meshulam / Tranzila / PayPlus behind the existing `PaymentProvider` (`docs/09-payments.md`)
- [ ] **Bundles:** admin bundle pricing UI + storefront display
- [ ] **Reviews:** submission + admin moderation UI
- [ ] **Instagram feed** integration on Home
- [ ] **Newsletter system** (Mailchimp/SendGrid) wired to subscribers
- [ ] **Google Analytics** integration
- [ ] **Gallery management** (full) in admin
- [ ] **Order notification emails** (`EmailProvider`)
- [ ] **Advanced shipping** calculator by region
- [ ] **Auth hardening** (`docs/08-admin-panel.md`): refresh tokens + rotation, httpOnly-cookie tokens, password reset, login lockout, optional 2FA/RBAC, or delegate to Supabase Auth
- **Acceptance:** each ships behind its interface/flag without regressing phase-1 flows.

---

## Suggested working order

1. Phase 0 (M0.1 → M0.2) — foundations + the pricing engine with tests.
2. Backend up to M1.5 (catalog + calculate-price) so the frontend has data.
3. Frontend M1.10 → M1.16 to reach the **core Product Detail** experience fast.
4. Orders/cart/checkout (M1.6, M1.17–M1.19), then admin (M1.22+), then hardening.
5. Phase 2 as prioritized post-launch.
