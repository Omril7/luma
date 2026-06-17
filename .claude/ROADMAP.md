# ROADMAP — Luma

Ordered, checkbox-driven build plan. Check items off as they land. Each milestone has an
**Acceptance** line. Deep detail for any topic lives in `.claude/docs/`. The build is
sequenced so the **Product Detail page with the live custom-price calculator** (the brief's
stated priority) is reachable as early as possible.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done. Phase-2 items are built later but their
**models exist from phase 1**.

> **Tracking:** check boxes here as work lands, **and** append a dated entry to
> `.claude/PROGRESS.md` (the chronological journal — what happened, decisions, blockers).
> **Deployment target:** Vercel (see `docs/10-devops.md` → "Production deployment — Vercel").
> **Shared DB:** `Order`/`Product` tables are shared with luma-manager
> (`C:\Users\omril\Projects\luma-manager`). Keep both tables; do not add order-management UI
> to this admin panel.

---

## Phase 0 — Foundations

### M0.1 App scaffold (single root Next.js) ✅

- [x] Create the Next.js app (App Router, TS, `src/`, `@/*` → `src/*`) at the repo root
- [x] Root `package.json` scripts (see `docs/10-devops.md`)
- [x] `tsconfig.json` (strict) — single, project-wide
- [x] ESLint + Prettier + lint-staged + husky pre-commit hook
- [x] `.env.example` with all vars; `.gitignore`; `README.md`
- **Acceptance:** `npm install` works; `npm run dev` starts the app (UI + `GET /api/health`); `next build` passes. (No Docker — dev uses Supabase directly.)

### M0.2 Shared logic (`src/shared/`) ✅

- [x] `src/shared/constants.ts` (Category, ShippingMethod, statuses, etc.)
- [x] `src/shared/types.ts` (DTOs shared by UI/API)
- [x] `src/shared/pricing.ts` (engine per `docs/03-pricing-engine.md`)
- [x] `src/shared/schemas/` (Zod: order, contact, newsletter, price-request, admin login, coupon)
- [x] `src/shared/pricing.test.ts` (full coverage — see `docs/11-testing-quality.md`)
- **Acceptance:** pricing unit tests pass; `src/shared/` stays framework-free and imports cleanly from UI and route handlers.

---

## Phase 1 — Backend core

### M1.1 Database schema ✅

- [x] `prisma/schema.prisma` with **all** models (incl. Bundle, Review, SiteContent, EmailSettings, NewsletterSend) per `docs/02-data-models.md`
- [x] First migration; Postgres running via docker or Supabase
- [x] Prisma client generated
- **Acceptance:** `npm run db:migrate` succeeds; `db:studio` shows all tables.

### M1.2 Seed data ✅

- [x] `prisma/seed.ts`: 3–4 products across categories, each w/ S/M/L variants, a pricing rule, 2–3 colors, multiple images (bilingual)
- [x] Coupons of each type (permanent, deadline, one-time, per-customer, first-order, auto-apply); newsletter subscribers; admin user; sample SiteContent blobs
- **Acceptance:** `npm run db:seed` populates a browsable catalog in he + en.

### M1.3 API foundation (Route Handlers) ✅

- [x] `src/server/http/` helpers: `withApi`/`withAdmin` wrappers, error-envelope mapping (`docs/04-api-contract.md`)
- [x] Zod validation helper; rate limiter for public writes; security headers in `next.config.ts`
- [x] Prisma client singleton (`src/server/prisma.ts`); `/uploads` serving (local fallback)
- **Acceptance:** `GET /api/health` returns 200; bad input returns the error envelope.

### M1.4 Pricing service ✅

- [x] `services/pricingService.ts` loads product+variants+rule, calls `src/shared/pricing.ts`
- **Acceptance:** server price matches client preview for the same inputs (parity test).

### M1.5 Public catalog endpoints ✅

- [x] `GET /products` (filters/sort/paginate), `GET /products/:slug`, `GET /categories`
- [x] `POST /products/:id/calculate-price`
- **Acceptance:** endpoints return seeded data; calculate-price validates + computes correctly.

### M1.6 Orders & coupons

- [ ] `POST /orders` (server recomputes all line prices + totals, persists snapshot)
- [ ] `GET /orders/:id`; `POST /orders/:id/apply-coupon` (all coupon type validations: validity window, maxUses, singleUsePerCustomer, firstOrderOnly, autoApply)
- **Acceptance:** an order created from a custom-dimension cart stores correct authoritative totals; all coupon types apply correctly.

### M1.7 Misc public endpoints

- [ ] `POST /contact`, `POST /newsletter/subscribe`, `GET /gallery`, `GET /reviews/:productId`, `GET /faq`
- **Acceptance:** each validates input and persists/returns as specified.

### M1.8 Admin auth + product CRUD

- [ ] `POST /admin/auth/login` (JWT, hashed password), `auth` middleware on `/admin/*`
- [ ] CRUD: products (+variants, pricing rule, colors, images via Cloudinary)
- [ ] `POST /api/admin/upload` → CloudinaryStorageProvider
- **Acceptance:** admin token required; full product lifecycle manageable via API; images upload to Cloudinary.

### M1.9 Admin: coupons, site content, email, newsletter

- [ ] CRUD: coupons (all fields: singleUsePerCustomer, firstOrderOnly, autoApply, validUntil, maxUses, …)
- [ ] CRUD: site-content blobs (home, about, faq, gallery intro, contact)
- [ ] Read/update: email-settings (fromAddress, fromName bilingual, replyTo)
- [ ] `GET /admin/newsletter` (list subscribers + CSV export), `POST /admin/newsletter/send` (dispatch via EmailProvider)
- [ ] CRUD: gallery, faq
- [ ] Read/update: settings (business info, shipping costs)
- [ ] Stubs/shells: `/admin/bundles`, `/admin/reviews`
- **Acceptance:** all endpoints operational; newsletter send dispatches via ConsoleEmailProvider in dev.

### M1.10 Storage abstraction

- [ ] `StorageProvider` interface + `CloudinaryStorageProvider` (primary) + `LocalStorageProvider` (fallback)
- **Acceptance:** uploaded image returns a served URL; switching `STORAGE_DRIVER` changes provider.

---

## Phase 1 — Frontend core

### M1.11 App setup ✅

- [x] Tailwind w/ logical properties + token mapping; `motion` (`motion/react`) dependency added
- [x] `styles/globals.css` + theme CSS variables (`docs/07-design-system.md`); fonts (Heebo/Rubik + Inter) via `next/font`
- **Acceptance:** themed blank app renders; changing a CSS var re-skins it.

### M1.12 i18n + RTL + layouts ✅

- [x] next-intl; `[lang]` locale segment; `he.json`/`en.json`; default he/RTL
- [x] `[lang]/layout.tsx` sets `<html lang dir>`; `languageStore` mirrors locale
- [x] `StorefrontLayout` + `AdminLayout` via App Router `layout.tsx`
- **Acceptance:** switching locale flips direction and all UI strings; no hardcoded text.

### M1.13 API client + stores ✅

- [x] `lib/api.ts` (typed, error-envelope aware, attaches admin JWT)
- [x] `cartStore` (persisted, uses `src/shared/pricing.ts`), `uiStore` (toasts, a11y prefs)
- **Acceptance:** cart math correct and persists across reload.

### M1.14 Storefront shell ✅

- [x] Header (logo, nav, language switcher, cart badge), footer
- [x] Floating WhatsApp button (logical positioning, env number)
- [x] Accessibility widget (font scale, contrast, draggable via `motion/react`)
- **Acceptance:** shell responsive + RTL-correct; a11y widget is draggable and changes the page.

### M1.15 Home page ✅

- [x] Hero + CTA, featured products grid, Our Story teaser, testimonials + Instagram placeholders
- **Acceptance:** featured products load from API; mobile-first layout.

### M1.16 Shop / catalog

- [x] Category filter, sort (price/newest/name), responsive cards ("from ₪X")
- **Acceptance:** filtering/sorting hit the API and update the grid.

### M1.16b Wishlist

- [ ] `wishlistStore` (Zustand, persisted to localStorage); SSR-safe hydration
- [ ] Heart-icon toggle on product cards + Product Detail page
- [ ] `/wishlist` page: saved products list with per-item add-to-cart
- [ ] Shareable via URL (`?wishlist=<ids>`)
- **Acceptance:** wishlist survives page refresh; shared URL restores the list.

### M1.16c Product comparison

- [ ] `compareStore` (Zustand, session-only, max 3 items)
- [ ] Compare toggle on product cards; floating "Compare (N)" bar when ≥1 selected
- [ ] `/compare` page: side-by-side table
- **Acceptance:** comparing 3 products shows a correct side-by-side table.

### M1.17 ⭐ Product Detail (CORE)

- [ ] Image gallery (swipeable mobile)
- [ ] Variant selector (S/M/L with dims)
- [ ] Custom-dimensions toggle + width/height/depth inputs with min/max constraints
- [ ] **Live price** via `src/shared/pricing.ts` (optional debounced server confirm)
- [ ] Color/finish swatches, quantity, Add to Cart, related products
- [ ] **Sticky add-to-cart bar** (mobile only, `md:hidden`)
- **Acceptance:** typing custom dimensions updates the price instantly and matches the server. _(Depends on M0.2, M1.5.)_

### M1.18 Cart

- [ ] Items (thumbnails, variant/custom info), qty +/-, coupon input
- [ ] Subtotal / shipping estimate / discount / total; checkout CTA
- **Acceptance:** all coupon types apply via API; totals correct.

### M1.19 Checkout

- [ ] Customer info form, shipping-vs-pickup, order summary sidebar
- [ ] "Pay with Credit Card" (stub), installments selector, terms checkbox
- [ ] Create order → `createPayment` → redirect / stub skip → confirmation
- **Acceptance:** completing checkout creates an order; confirmation page reflects it.

### M1.20 Order confirmation

- [ ] Thank-you, order number, summary, delivery timeframe
- **Acceptance:** confirmation reflects the persisted order.

### M1.21 Static pages

- [ ] About, Gallery (masonry + lightbox), Contact (form + WhatsApp + hours), FAQ (accordion)
- [ ] Legal: terms / privacy / returns (bilingual placeholder content)
- **Acceptance:** all render bilingually; contact + newsletter submit successfully.

### M1.22 SEO + performance

- [ ] Next Metadata API per-page meta (bilingual, correct lang)
- [ ] Server Components + `next/image` lazy-loading; bundle check
- **Acceptance:** Lighthouse pass on Home + Product (perf/a11y/SEO).

---

## Phase 1 — Admin panel

### M1.23 Admin auth + shell

- [ ] Login page + route guard; `AdminLayout` nav (no orders section)
- **Acceptance:** unauthenticated users redirected; layout navigates to all admin sections.

### M1.24 Products CRUD UI

- [ ] List + edit; manage variants, pricing rule, colors, image upload (Cloudinary), active/featured/sort
- [ ] "Preview on site" button on edit forms
- [ ] All admin tables: pagination with per-page selector (10 / 25 / 50)
- **Acceptance:** can create a customizable product end-to-end and see it on the storefront; images upload to Cloudinary.

### M1.25 Coupons management

- [ ] CRUD + activate/deactivate; all coupon type fields (singleUsePerCustomer, firstOrderOnly, autoApply, validUntil, maxUses, …)
- [ ] UI makes coupon type combinations clear (e.g. "Deadline code" preset)
- **Acceptance:** every coupon type created here works correctly at cart.

### M1.26 Site Content + Email Services

- [ ] Site Content page: edit all storefront static sections (home hero, About, FAQ, gallery intro, contact) — bilingual
- [ ] Email Services page: view/edit from address, display name; send test email; preview templates
- **Acceptance:** site content changes go live immediately; test email dispatches via ConsoleEmailProvider in dev.

### M1.27 Newsletter

- [ ] Subscribers tab: paginated list, search, CSV export
- [ ] Send Newsletter tab: compose (subject + body `_he`/`_en`), target by language, preview, send
- [ ] Send history log (date, subject, recipient count)
- **Acceptance:** newsletter send dispatches to all matching active subscribers.

### M1.28 Remaining admin

- [ ] Gallery management (upload/reorder/delete)
- [ ] Settings page (business info, shipping costs, WhatsApp number)
- [ ] Bundles + Reviews page shells (routes + placeholder)
- **Acceptance:** nav complete; settings drive storefront (e.g. shipping cost, WhatsApp number).

---

## Phase 1 — Hardening / launch readiness

### M1.29 Quality pass

- [ ] Toasts for all API success/error; form validation messages bilingual
- [ ] Security pass: sanitize, CORS, rate limits, upload validation, JWT expiry
- [ ] Responsive QA (mobile-first) + RTL QA (logical properties only)
- [ ] Accessibility QA (keyboard, labels, contrast, widget)
- **Acceptance:** all golden-rule gates in `docs/11-testing-quality.md` pass.

### M1.30 Tests

- [ ] Pricing unit tests green; key route-handler tests (Vitest, mocked requests)
- [ ] Playwright smoke: browse → custom price → cart → checkout (stub) → confirmation
- **Acceptance:** CI-style `typecheck + lint + test + build` all green.

### M1.31 Deploy to Vercel

- [ ] Import repo as a Next.js project (root = repo root); UI + `app/api` deploy automatically
- [ ] Supabase Postgres: pooled `DATABASE_URL` (`?pgbouncer=true`) + direct `DIRECT_URL` set in Vercel dashboard
- [ ] `STORAGE_DRIVER=cloudinary` + `CLOUDINARY_URL` + all other env vars set in Vercel dashboard
- [ ] `EMAIL_PROVIDER=nodemailer` + SMTP env vars configured for production email
- [ ] `prisma migrate deploy` as Vercel build command
- **Acceptance:** Preview + Production deployments serve the storefront and `/api`; images via Cloudinary; emails via Nodemailer SMTP. _(See `docs/10-devops.md`.)_

---

## Phase 2 — Post-launch

- [ ] **Payments:** integrate Meshulam / Tranzila / PayPlus behind the existing `PaymentProvider`
- [ ] **Bundles:** admin bundle pricing UI + storefront display
- [ ] **Reviews:** submission + admin moderation UI; carousel via **embla-carousel**
- [ ] **Instagram feed** integration on Home
- [ ] **Newsletter system** (Mailchimp/SendGrid) wired to `EmailProvider.sendNewsletter`
- [ ] **Google Analytics** integration
- [ ] **Emails:** wire `EmailProvider` (SendGrid/SES) — order confirmation + new order alert on payment success; bilingual templates
- [ ] **Advanced shipping** calculator by region
- [ ] **Auth hardening:** refresh tokens + rotation, httpOnly-cookie tokens, password reset, login lockout, optional 2FA/RBAC, or delegate to Supabase Auth
- **Acceptance:** each ships behind its interface/flag without regressing phase-1 flows.

---

## Suggested working order

1. Phase 0 (M0.1 → M0.2) — foundations + the pricing engine with tests.
2. Backend up to M1.5 (catalog + calculate-price) so the frontend has data.
3. Frontend M1.11 → M1.17 to reach the **core Product Detail** experience fast.
4. Orders/cart/checkout (M1.6, M1.18–M1.20), then admin (M1.23+), then hardening.
5. Phase 2 as prioritized post-launch.
