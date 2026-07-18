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

- [x] `POST /orders` (server recomputes all line prices + totals, persists snapshot)
- [x] `GET /orders/:id`; `POST /api/coupons/validate` (validity window, maxUses, minOrderAmount; per-customer/first-order checks deferred to createOrder)
- **Acceptance:** an order created from a custom-dimension cart stores correct authoritative totals; all coupon types apply correctly.

### M1.7 Misc public endpoints ✅

- [x] `POST /contact`, `POST /newsletter/subscribe`, `GET /gallery`, `GET /reviews/:productId`, `GET /faq`
- **Acceptance:** each validates input and persists/returns as specified.

### M1.8 Admin auth + product CRUD ✅

- [x] `POST /admin/auth/login` (JWT, hashed password), `auth` middleware on `/admin/*`
- [x] CRUD: products (+variants, pricing rule, colors, images via Cloudinary)
- [x] `POST /api/admin/upload` → CloudinaryStorageProvider
- **Acceptance:** admin token required; full product lifecycle manageable via API; images upload to Cloudinary.

### M1.9 Admin: coupons, site content, email, newsletter ✅

- [x] CRUD: coupons (all fields: singleUsePerCustomer, firstOrderOnly, autoApply, validUntil, maxUses, …)
- [x] CRUD: site-content blobs (home, about, faq, gallery intro, contact)
- [x] Read/update: email-settings (fromAddress, fromName bilingual, replyTo)
- [x] `GET /admin/newsletter` (list subscribers + CSV export), `POST /admin/newsletter/send` (dispatch via EmailProvider)
- [x] CRUD: gallery, faq
- [x] Read/update: settings (business info, shipping costs)
- [x] Stubs/shells: `/admin/bundles`, `/admin/reviews`
- **Acceptance:** all endpoints operational; newsletter send dispatches via ConsoleEmailProvider in dev.

### M1.10 Storage abstraction ✅

- [x] `StorageProvider` interface + `CloudinaryStorageProvider` (primary) + `LocalStorageProvider` (fallback)
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

### M1.14b Header info bar ✅

- [x] Phone number in navbar (click-to-call `tel:` link, logical placement, sourced from Settings)
- [x] Small working-hours bar above the navbar (bilingual, collapses/hides on mobile if too cramped)
- **Acceptance:** phone number and hours are visible on every storefront page, RTL/LTR correct, and pull from admin Settings rather than being hardcoded.

### M1.15 Home page ✅

- [x] Hero + CTA, featured products grid, Our Story teaser, testimonials + Instagram placeholders
- **Acceptance:** featured products load from API; mobile-first layout.

### M1.16 Shop / catalog

- [x] Category filter, sort (price/newest/name), responsive cards ("from ₪X")
- **Acceptance:** filtering/sorting hit the API and update the grid.

### M1.16b Wishlist

- [x] `wishlistStore` (Zustand, persisted to localStorage); SSR-safe hydration
- [x] Heart-icon toggle on product cards + Product Detail page
- [ ] `/wishlist` page: saved products list with per-item add-to-cart
- [ ] Shareable via URL (`?wishlist=<ids>`)
- **Acceptance:** wishlist survives page refresh; shared URL restores the list. _(Store + toggle
  landed as part of M1.15/M1.17; the dedicated `/wishlist` page and shareable-URL restore are
  still outstanding.)_

### M1.16c Product comparison

- [ ] `compareStore` (Zustand, session-only, max 3 items)
- [ ] Compare toggle on product cards; floating "Compare (N)" bar when ≥1 selected
- [ ] `/compare` page: side-by-side table
- **Acceptance:** comparing 3 products shows a correct side-by-side table.

### M1.17 ⭐ Product Detail (CORE)

- [x] Image gallery (swipeable mobile)
- [x] Variant selector (S/M/L with dims)
- [x] Custom-dimensions toggle + width/height/depth inputs with min/max constraints
- [x] **Live price** via `src/shared/pricing.ts` (optional debounced server confirm)
- [x] Color/finish swatches, quantity, Add to Cart, related products
- [x] **Sticky add-to-cart bar** (mobile only, `md:hidden`)
- **Acceptance:** typing custom dimensions updates the price instantly and matches the server. _(Depends on M0.2, M1.5.)_

### M1.18 Cart

- [x] Items (thumbnails, variant/custom info), qty +/-, coupon input
- [x] Subtotal / shipping estimate / discount / total; checkout CTA
- **Acceptance:** all coupon types apply via API; totals correct.

### M1.19 Checkout

- [x] Customer info form, shipping-vs-pickup, order summary sidebar
- [x] "Pay with Credit Card" (stub), installments selector, terms checkbox
- [x] Create order → `createPayment` → redirect / stub skip → confirmation
- **Acceptance:** completing checkout creates an order; confirmation page reflects it.

### M1.20 Order confirmation

- [x] Thank-you, order number, summary, delivery timeframe
- **Acceptance:** confirmation reflects the persisted order.

### M1.21 Static pages

- [x] About, Gallery (masonry + lightbox), Contact (form + WhatsApp + hours), FAQ (accordion)
- [ ] Legal: terms / privacy / returns (bilingual placeholder content) — deferred with the rest of
      the shop/checkout flow; footer links are hidden while `FEATURES.shop` is `false`
      (`src/lib/featureFlags.ts`). Build alongside re-enabling the shop.
- **Acceptance:** all render bilingually; contact submits successfully. _(Newsletter subscribe has
  no storefront UI yet — only the admin-facing send flow from M1.27; not part of this milestone.)_

### M1.21.b Footer, sharing & theming polish

- [x] Footer: add links to socials (Instagram, Facebook)
- [x] Share button — copies the page URL; when shared via WhatsApp shows a rich link
      preview (title/image via Open Graph tags)
- [x] Audit OS-level dark mode (`prefers-color-scheme: dark`) so colors match the custom
      dark mode already defined for the accessibility widget, instead of diverging
- [x] `InstagramSection` (`src/features/home/InstagramSection.tsx`) — wire up to a real
      Instagram account (decide: Graph API feed vs. manual admin-curated images — went with
      admin-curated images via a new `/admin/instagram` panel, mirroring the Gallery pattern)

### M1.22 SEO + performance

- [x] Next Metadata API per-page meta (bilingual, correct lang) — every storefront route (home,
      shop, product, cart, checkout, confirmation, about, gallery, contact, faq) already ships
      `generateMetadata`/`metadata`
- [ ] Server Components + `next/image` lazy-loading; bundle check — not yet audited (gallery
      intentionally uses raw `<img>` for masonry sizing, see M1.21 notes; product images already
      use `next/image`)
- [ ] Run Lighthouse and address findings
- **Acceptance:** Lighthouse pass on Home + Product (perf/a11y/SEO).

---

## Phase 1 — Admin panel

### M1.23 Admin auth + shell

- [x] Login page + route guard; `AdminLayout` nav (no orders section)
- **Acceptance:** unauthenticated users redirected; layout navigates to all admin sections.

### M1.24 Products CRUD UI ✅

- [x] List + edit; manage variants, pricing rule, colors, image upload (Cloudinary), active/featured/sort
- [x] "Preview on site" button on edit forms
- [x] All admin tables: pagination with per-page selector (10 / 25 / 50)
- **Acceptance:** can create a customizable product end-to-end and see it on the storefront; images upload to Cloudinary.

### M1.25 Coupons management ✅

- [x] CRUD + activate/deactivate; all coupon type fields (singleUsePerCustomer, firstOrderOnly, autoApply, validUntil, maxUses, …)
- [x] UI makes coupon type combinations clear (e.g. "Deadline code" preset)
- **Acceptance:** every coupon type created here works correctly at cart. _(Route/page still exist
  but the sidebar nav entry is currently commented out in `src/features/admin/adminNav.ts` while
  `FEATURES.shop=false` — coupons aren't actionable until checkout is re-enabled; re-link it
  alongside M1.28e's flag flip.)_

### M1.26 Site Content + Email Services ✅

- [x] Site Content page: edit all storefront static sections (About, FAQ, gallery intro, contact) — bilingual _(home hero/story tabs were removed as dead inputs, see M1.28d)_
- [x] Email Services page: view/edit from address, display name; send test email; preview templates
- **Acceptance:** site content changes go live immediately; test email dispatches via the configured `EmailProvider` (Nodemailer in production, console stub in dev — see M1.28d). _(Nav entry also
  currently commented out in `adminNav.ts`, same as Coupons — the route still works if visited
  directly.)_

### M1.27 Newsletter ✅

- [x] Subscribers tab: paginated list, search, CSV export
- [x] Send Newsletter tab: compose (subject + body `_he`/`_en`), target by language, preview, send
- [x] Send history log (date, subject, recipient count)
- **Acceptance:** newsletter send dispatches to all matching active subscribers.

### M1.28 Remaining admin ✅

- [x] Gallery management (upload/reorder/delete)
- [x] Settings page (business info, shipping costs, WhatsApp number)
- [x] Bundles + Reviews page shells (routes + placeholder) _(Reviews was later upgraded to a real
      moderation queue — see Phase 2 "Reviews" below; Bundles is still the placeholder shell)_
- **Acceptance:** nav complete; settings drive storefront (e.g. shipping cost, WhatsApp number).

### M1.28b Distance-based delivery pricing ✅

Replace flat-rate national shipping with road-distance-based fee calculated live at checkout using OpenRouteService.

- [x] **Settings fields** — add `delivery` block to `SiteSettingsDTO` + `updateSettingsSchema`: `studioAddress`, cached `studioLat`/`studioLng`, `deliveryRatePerKm` (₪/km), `minDeliveryFee`, `maxDeliveryFee` (₪, 0 = no cap)
- [x] **Distance service** — `src/server/services/deliveryDistanceService.ts`: geocode address via ORS, fetch road distance via ORS Directions API (driving-car), apply rate + clamp min/max
- [x] **Estimate endpoint** — `POST /api/delivery/estimate` (public): body `{ address }`, returns `{ distanceKm, fee, ratePerKm, minFee, maxFee }`
- [x] **Order service** — replace hardcoded ₪150 with server-side distance recalculation for `NATIONAL_SHIPPING`
- [x] **Admin settings UI** — new "משלוח לפי מרחק" section: studio address, ₪/km rate, min/max fee; save geocodes and caches studio coords
- [x] **Checkout UI** — debounced (800ms) live estimate after street+city filled; inline loading/success/error states; block submit on unresolved error
- [x] **i18n** — add `he.json`/`en.json` keys for new checkout + admin strings
- [x] **Env var** — `OPENROUTESERVICE_API_KEY` documented in `.claude/docs/10-devops.md`
- **Acceptance:** entering a delivery address in checkout shows a live fee (₪ + km); admin can configure all rate/limit params; order total reflects the distance fee; geocoding error shows an inline "address not found" message and blocks checkout.

### M1.28c Category taxonomy: enum → admin-managed table ✅

- [x] `Category` Prisma model (replacing the fixed enum) + staged migration + backfill; `Product.categoryId` FK
- [x] `src/shared/` (`constants.ts`, `types.ts`, `schemas/`) updated to the relational shape
- [x] Public `GET /api/categories` + `getProducts` filter reworked to the table
- [x] Admin CRUD: full `/admin/products/categories` management view (create/edit/reorder/deactivate), replacing the create-only inline picker
- [x] Storefront (`ShopClient` filter pills, `ProductDetail` category badge) reads bilingual names from the relation
- **Acceptance:** categories can be added/renamed/reordered/deactivated without a deploy; storefront filter + product badge reflect changes immediately; deactivating a category doesn't break products still assigned to it. _(`.claude/docs/13-category-taxonomy.md`.)_

### M1.28d Admin ↔ site-data sync fixes ✅

Audit-driven punch list closing gaps between what the admin panel lets you edit and what the storefront/emails actually read — see `.claude/docs/admin-site-data-sync-plan.md`.

- [x] Removed dead `home.hero`/`home.story` SiteContent admin tabs (never read by the storefront, which uses static i18n)
- [x] Wired `EmailSettings` (`fromAddress`/`fromName_he/en`/`replyTo`) into every outgoing email — newsletter sends, test-send, and the Nodemailer provider all use the configured sender instead of a hardcoded `EMAIL_FROM`
- [x] Public newsletter signup: `NewsletterSignupForm` in the footer + an opt-in checkbox on the contact form (server-side, best-effort, doesn't block contact submission)
- [x] `ColorOption` admin: full CRUD (`/admin/products/colors`) + `imageUrl` texture thumbnail wired into the storefront swatch (falls back to `hexCode`)
- [x] `ProductVariant.diameter` admin input added to the variant row editor (round-product custom pricing)
- [x] Review bilingual fallback: storefront renders whichever of `comment_he`/`comment_en` exists instead of dropping a review with a missing translation
- [x] Deleted the duplicate unlinked `/admin/site-content` route (`/admin/content` is canonical)
- [ ] Deferred (documented, not urgent while `FEATURES.shop=false`): coupon `autoApply` has no reader; `singleUsePerCustomer`/`firstOrderOnly` not enforced in `validateCoupon` — revisit alongside shop re-enablement
- **Acceptance:** every admin-editable field that's supposed to affect the storefront/emails does; sending a test email shows the configured From/Reply-To; footer + contact-form signup both create subscriber rows.

### M1.28e Showcase mode (browse-only catalog while purchasing is disabled) ✅

- [x] `/shop` and `/product/[slug]` unconditionally reachable (no longer gated by `FEATURES.shop`); `/cart`, `/checkout`, `/order-confirmation` stay redirected while `FEATURES.shop=false`
- [x] `getStartingPrice` helper in `src/shared/pricing.ts` (single source of truth for "from ₪X")
- [x] `ProductDetail` shows a reduced showcase box (gallery, name, description, "starting from" price, wishlist, share, related products, reviews) with no buy box/variant/custom-dimension/quantity/add-to-cart controls when purchasing is disabled
- [x] Header/Footer catalog links unconditional; cart icon stays gated
- **Acceptance:** with `FEATURES.shop=false`, visitors can browse the full catalog and product pages with a static price and no purchase affordances; flipping the flag back to `true` restores the full buy flow with zero regressions. _(`.claude/docs/12-showcase-mode.md`.)_

### M1.28f Gallery image titles/subtitles

- [ ] Extend the gallery item shape (SiteContent `gallery` blob, `adminGalleryService.ts`) with bilingual `title_he`/`title_en` + `subtitle_he`/`subtitle_en` per image, in addition to (or replacing) the current `altText_he`/`altText_en`
- [ ] Admin `GalleryPage.tsx`: add title + subtitle fields (bilingual) to both the "add new image" form and each existing image's edit card, alongside the current alt-text inputs
- [ ] Storefront `GalleryClient.tsx`: render the locale-appropriate title/subtitle as a caption overlay on each masonry tile (and/or under the image in the lightbox) when set; fall back gracefully when empty
- [ ] Decide alt-text handling: either keep `altText_*` as a separate a11y-only field, or derive the `<img alt>` from `title_*` when no dedicated alt text is set (avoid duplicate bilingual inputs if titles already describe the image)
- [ ] `GalleryImageDTO` (shared between admin service, public `listGalleryImages`, and `GalleryClient`) updated accordingly; no new Prisma model needed (still a JSON blob under `SiteContent` key `gallery`)
- **Acceptance:** every gallery image can have a bilingual title + subtitle set in the admin; the public `/gallery` page displays them as a caption on the image (grid and/or lightbox); existing images without a title still render without a broken/empty caption.

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
- [x] **Reviews:** public review form (rating + text, per product) so any visitor can leave a review; admin moderation queue (approve/reject) before publishing; storefront carousel via **embla-carousel**
- [x] **Instagram feed** integration on Home — shipped as admin-curated images (`/admin/instagram`, mirrors the Gallery pattern) rather than the live Graph API, per the M1.21.b decision
- [ ] **Newsletter system** (Mailchimp/SendGrid) wired to `EmailProvider.sendNewsletter` — basic
      in-house sending (Nodemailer SMTP, correct From/Reply-To) already works end-to-end via M1.27 + M1.28d; this item is specifically about swapping in a dedicated ESP for deliverability/analytics, not a functional gap
- [ ] **Google Analytics** integration
- [ ] **Emails:** wire `EmailProvider` (SendGrid/SES) — order confirmation + new order alert on payment success; bilingual templates _(sender config is correct as of M1.28d; no transactional order-confirmation/alert emails are actually sent yet — that part is still open)_
- [ ] **Auth hardening:** refresh tokens + rotation, httpOnly-cookie tokens, password reset, login lockout, optional 2FA/RBAC, or delegate to Supabase Auth
- **Acceptance:** each ships behind its interface/flag without regressing phase-1 flows.

---

## Suggested working order

1. Phase 0 (M0.1 → M0.2) — foundations + the pricing engine with tests.
2. Backend up to M1.5 (catalog + calculate-price) so the frontend has data.
3. Frontend M1.11 → M1.17 to reach the **core Product Detail** experience fast.
4. Orders/cart/checkout (M1.6, M1.18–M1.20), then admin (M1.23+), then hardening.
5. Phase 2 as prioritized post-launch.
