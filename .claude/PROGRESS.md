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

## 2026-07-19 — Price-offer requests (product page → admin notification)

- **Done:** Customers can request a price offer for any product. New `PriceOfferRequest`
  Prisma model (+ `PriceOfferStatus` enum, migration `20260719120000_price_offer_requests`)
  storing customer contact + a snapshot of the selection (variant/custom dims/color/qty) and
  the engine's price estimate when priceable. Public `POST /api/price-offers` (rate-limited
  5/10min) via `priceOfferService.createPriceOfferRequest`, which also emails the admin
  (business email from site settings, fallback reply-to/from-address; best-effort, Hebrew
  HTML, customer as reply-to). Storefront: `PriceOfferModal.tsx` + "בקשת הצעת מחיר" button in
  `ProductDetail` (outline button in shop mode, primary CTA in showcase mode) with the current
  selection summarized; i18n keys under `product.priceOffer` (he+en). Admin: `/admin/price-offers`
  page (`PriceOffersListPage`, mirrors reviews-list pattern) with NEW/HANDLED filter, status
  toggle, delete, tel:/wa.me/mailto links per request; new sidebar entry; new shared
  `WhatsAppIcon` component. Product deletion now also removes its offer requests.
- **Decisions:** Selection stored as label snapshots (`variantName`, `colorName`), not FKs, so
  requests survive renames/deletions. Pricing errors (out-of-bounds dims) are non-fatal — an
  unpriceable selection is a prime reason to request an offer, so `quotedPrice` is optional.
  Migration applied via `migrate diff` + `db execute` + `migrate resolve` because `migrate dev`
  demanded a destructive reset (pre-existing drift: `20260713120000_category_table` was edited
  after being applied — its checksum no longer matches; see Notes).
- **Notes/blockers:** typecheck/lint/tests clean. Verified end-to-end: POST created the row
  (₪4,200 estimate for a 240cm custom console) and ConsoleEmailProvider logged the Hebrew
  notification email; test row deleted afterwards. **Follow-up:** the `category_table`
  migration checksum drift will make every future `prisma migrate dev` demand a reset —
  should be fixed (update the checksum in `_prisma_migrations` or restore the original file).

---

## 2026-07-12 — Admin-managed homepage testimonials

- **Done:** Added a "דף הבית — המלצות לקוחות" tab to `SiteContentPage.tsx` (`TestimonialsTab`,
  mirrors the existing `FaqTab` add/reorder/delete pattern; rating via the shared
  `StarRating` component), storing to the generic `SiteContent` key `home.testimonials` —
  no new backend needed (same generic `PUT /api/admin/site-content/:key` used by
  hero/story/faq/gallery). `TestimonialsSection.tsx` converted from hardcoded
  `TESTIMONIALS_HE`/`TESTIMONIALS_EN` arrays to an `items` prop (returns `null` when empty);
  `(storefront)/page.tsx` now fetches `home.testimonials` server-side via
  `getSiteContentByKey` (same pattern as the FAQ/About pages) and passes it down.
- **Decisions:** Discovered `home.hero`/`home.story` SiteContent tabs exist in the admin but
  are **not** actually wired to `HeroSection`/`StorySection` (those read static i18n strings
  instead) — pre-existing disconnect, left as-is/out of scope. Also found orphaned
  `adminFaqService.ts` + `/api/admin/faq` + `/api/faq` routes (an earlier design using a
  dedicated `key: 'faq'` blob) that the live FAQ page doesn't use (it reads `faq.items` via
  the generic site-content service) — noted but not cleaned up, out of scope for this task.
- **Notes/blockers:** typecheck + lint clean. Verified end-to-end with Playwright: added a
  testimonial in admin, saved, confirmed it rendered on both `/he` and `/en` homepages with
  correct rating/quote/author/location, then cleaned up the test data via the API.

---

## 2026-07-12 — Phase 2: Reviews (public submission + admin moderation + carousel) ✅

- **Done:**
  - Backend: `src/server/services/reviewService.ts` (`getApprovedReviewsForProduct`,
    `createReview`); `createReviewSchema` + `ReviewDTO`/`PublicReviewDTO`; public
    `POST /api/reviews` (rate-limited, 5/15min) alongside the existing
    `GET /api/reviews/[productId]`; admin `DELETE /api/admin/reviews/[id]` added next to the
    existing GET/PATCH.
  - Admin: `src/features/admin/reviews/ReviewsListPage.tsx` — real moderation queue (status
    filter, approve/unpublish, delete with confirm dialog) replacing the `/admin/reviews`
    placeholder shell.
  - Storefront: `src/components/ui/StarRating.tsx` (shared read-only/interactive component);
    `src/features/reviews/{ReviewsCarousel,ReviewForm,ReviewsSection}.tsx` (embla-carousel,
    RTL-aware); wired into `ProductDetail.tsx` after "Related products" via
    `product/[slug]/page.tsx` fetching reviews server-side. New `"reviews"` i18n section in
    `he.json`/`en.json`.
- **Roadmap:** Phase 2 "Reviews" item ✅ (Bundles and other Phase 2 items untouched).
- **Decisions:** `Review.isApproved` is a plain boolean (no "rejected" state), so moderation
  uses approve/unpublish + a separate delete action rather than a three-state workflow.
  Verified end-to-end via API (curl) + a Playwright pass against the admin UI; the storefront
  form/carousel couldn't be screenshotted in this session because `FEATURES.shop` is
  currently `false` (shop on hold) — user will verify that part visually themselves.
- **Notes/blockers:** none — typecheck + lint clean.

---

## 2026-07-11 — M1.21: Static pages (About, Gallery, Contact, FAQ) ✅

- **Done:**
  - `src/app/[lang]/(storefront)/about/page.tsx` + `src/features/about/AboutContent.tsx` — reads
    `about.page` SiteContent (title/body/image, bilingual), animated 2-col layout, SVG placeholder
    when no image is set.
  - `src/app/[lang]/(storefront)/gallery/page.tsx` + `src/features/gallery/GalleryClient.tsx` —
    reads `gallery.intro` SiteContent + `listGalleryImages()`; CSS-columns masonry grid (raw
    `<img>`, not `next/image`, since intrinsic dimensions aren't stored — matches the existing
    `eslint-disable-next-line @next/next/no-img-element` pattern in `ImageUpload.tsx`); lightbox
    modal with keyboard (Esc/Arrow, RTL-aware), backdrop-click, and button navigation; empty state.
  - `src/app/[lang]/(storefront)/contact/page.tsx` + `src/features/contact/ContactClient.tsx` —
    reads `contact.info` SiteContent; form (name/email/phone/subject/message) posts to the existing
    `POST /api/contact`; client validation with focus-first-invalid-field; info sidebar
    (click-to-call, mailto, address, hours) + WhatsApp CTA.
  - `src/app/[lang]/(storefront)/faq/page.tsx` + `src/features/faq/FaqClient.tsx` — reads
    `faq.items` SiteContent; single-open accordion (`motion` height reveal, WAI-ARIA accordion
    pattern: `h2` > `button[aria-expanded]` > `region[aria-labelledby]`).
  - `he.json`/`en.json` — new `about`, `gallery`, `contact`, `faq` top-level namespaces;
    `footer.faq` key.
  - `Footer.tsx` — added `/faq` link; `terms`/`privacy`/`returns` links now gated behind
    `FEATURES.shop` (see Decisions).
- **Roadmap:** M1.21 ✅ (static content pages); legal pages intentionally left unchecked — see
  roadmap note.
- **Decisions:**
  - Legal pages (terms/privacy/returns) were **not** built this session per direction: they ship
    alongside the shop/checkout flow, which is on hold (`FEATURES.shop = false` in
    `src/lib/featureFlags.ts`). The footer already linked `/terms`, `/privacy`, `/returns`
    unconditionally (dead links); they're now gated behind `FEATURES.shop` like the other
    shop-only nav entries so nothing 404s while the flag is off.
  - Contact page sources phone/whatsapp/email/address/hours from the `contact.info` SiteContent
    key (edited via the admin Site Content → "יצירת קשר" tab, built ahead of time in M1.26) rather
    than `adminSettingsService`'s `BusinessSettings` (used by Header/InfoBar). Only `contact.info`
    has realistic seed data; `BusinessSettings` phone/whatsapp/email are still blank by default.
    These two stores overlap in purpose (both hold phone/address/hours) — worth consolidating in
    a future pass, but out of scope here.
  - Gallery images render as plain `<img>` (masonry needs each image's natural aspect ratio;
    `GalleryImageDTO` has no width/height field, so `next/image`'s `fill` mode isn't usable without
    forcing a fixed aspect ratio that would defeat the masonry look).
  - Roadmap's original M1.21 acceptance line mentioned "newsletter submit successfully" — no
    storefront newsletter signup UI exists (only the admin send flow from M1.27); left as a gap,
    not built, since it wasn't part of the four pages requested.
- **Notes/blockers:** `npm run typecheck`, `npm run lint` (no new warnings), `npm run test` (17/17
  pricing tests) all green. `npm run build` requires `NODE_ENV` unset/production (pre-existing
  quirk, see M0.2 notes below) — confirmed all four new routes prerender for `he`/`en`.

---

## 2026-07-04 — M1.14b: Header info bar ✅

- **Done:**
  - `src/shared/schemas/index.ts` — added `hours_he`/`hours_en` to `updateSettingsSchema`
  - `src/server/services/adminSettingsService.ts` — `BusinessSettings.hours_he`/`hours_en` (with sensible defaults), threaded through `DEFAULT_SETTINGS` and `upsertSiteSettings`
  - `src/features/admin/settings/SettingsPage.tsx` — bilingual "שעות פעילות / Working hours" fields in the Business Info section, saved via the existing `handleSaveBiz`
  - `src/components/layouts/InfoBar.tsx` — new server component: thin bar above the navbar showing the locale's hours text, `hidden md:block` (hides on mobile per the roadmap note), renders nothing if empty
  - `src/components/layouts/Header.tsx` — new `phone` prop; click-to-call `tel:` link (digits/`+` stripped) shown in the desktop actions row (`lg:flex`) and appended to the mobile dropdown nav so it's reachable on every breakpoint
  - `src/components/layouts/StorefrontLayout.tsx` — fetches `getSiteSettings()` server-side and passes `business.phone` to `Header` and the locale's hours string to `InfoBar`, inserted above `<Header />`
  - `src/i18n/en.json` / `he.json` — added `header.callUs` aria-label
- **Roadmap:** M1.14b ✅
- **Decisions:** No new Prisma model/migration — hours live on the existing `SiteContent`-backed `BusinessSettings` JSON blob, consistent with how `phone`/`whatsappNumber` are already stored. Phone number is a single field (not `_he`/`_en`) since digits aren't language-dependent; hours are bilingual since they're free text. Data is fetched directly via the server-only `getSiteSettings()` service (not through the admin HTTP API), matching the existing pattern already used by `src/app/api/delivery/estimate/route.ts`.
- **Notes/blockers:** none.

---

## 2026-06-20 — M1.28b: Distance-based delivery pricing ✅

- **Done:**
  - `src/server/services/deliveryDistanceService.ts` — `geocodeIsraeliAddress` (ORS geocode API, Israel-bounded), `getRoadDistanceKm` (ORS directions driving-car), `calculateDeliveryFee` (rate × km, clamped min/max); custom `DeliveryEstimateError` with typed codes
  - `src/app/api/delivery/estimate/route.ts` — public `POST` endpoint; 422 on bad address, 503 when unconfigured, 200 with `{ distanceKm, fee, ratePerKm, minFee, maxFee }`
  - `src/shared/schemas/index.ts` — added `studioAddress`, `deliveryRatePerKm`, `minDeliveryFee`, `maxDeliveryFee` to `updateSettingsSchema`
  - `src/server/services/adminSettingsService.ts` — new `DeliverySettings` interface + `delivery` block in `SiteSettingsDTO`; auto-geocodes studio address on save and caches lat/lng
  - `src/server/services/orderService.ts` — replaced hardcoded ₪150 with dynamic `calculateDeliveryFee` call; falls back to `minDeliveryFee` on ORS failure
  - `src/features/admin/settings/SettingsPage.tsx` — new "משלוח לפי מרחק (ORS)" section with studio address, ₪/km rate, min/max fee inputs; separate Save section
  - `src/features/checkout/CheckoutClient.tsx` — 800ms debounced estimate on street+city change; inline spinner/error/fee feedback; submit disabled until estimate resolves; sidebar shows live fee or `...`
  - `src/i18n/he.json` + `en.json` — 6 new `checkout` keys
  - `.claude/docs/10-devops.md` — `OPENROUTESERVICE_API_KEY` documented in env var reference
- **Roadmap:** M1.28b ✅
- **Decisions:**
  - Use **OpenRouteService (ORS)** free tier (2,000 req/day, no billing account required) for both geocoding and road-distance calculation. Can swap to Google Maps later.
  - Road distance (not straight-line) for fairness on hilly/winding Israeli terrain.
  - Delivery fields stored as a new `delivery` block in the existing `SiteContent` JSON settings (no Prisma migration needed).
  - Studio address is geocoded on admin Save and cached as `studioLat`/`studioLng` to avoid re-geocoding on every order.
  - Server re-calculates the fee independently on order create (client sends address, server computes authoritative cost).
  - Geocoding failure → inline "address not found" error in checkout; submit button stays blocked until resolved.
  - Min/max delivery fee caps configurable by admin (0 maxDeliveryFee = no cap).
  - `OPENROUTESERVICE_API_KEY` env var required.
- **Notes/blockers:** Admin must set studio address + rate in Settings before live estimates work. ORS free tier allows 2,000 req/day — sufficient for a small furniture business.

## 2026-06-19 — M1.28: Remaining admin UI (gallery, settings, shells)

- **Done:**
  - `src/features/admin/gallery/GalleryPage.tsx` — image grid (2-3 cols responsive); per-card up/down reorder (optimistic swap of sortOrders → two PATCH requests, reverts on failure); delete with confirmation dialog; bottom "add new" form with `ImageUpload` + bilingual altText_he/en; loading/error states; inline success feedback
  - `src/features/admin/settings/SettingsPage.tsx` — two sections: Business Info (bilingual name, address, phone, whatsapp, email) and Shipping (cost ₪, optional free-shipping threshold); per-section Save with inline success/error; page-level loading spinner
  - `src/app/(admin)/admin/gallery/page.tsx`, `settings/page.tsx` — thin Server Component wrappers
  - `src/app/(admin)/admin/bundles/page.tsx`, `reviews/page.tsx` — placeholder shells with PackageOpen/Star icons and "coming soon" messaging
- **Roadmap:** M1.28 ✅
- **Decisions:** Reorder persists by swapping `sortOrder` values between two adjacent items and PATCHing both; optimistic update prevents jitter. Shipping `freeShippingAbove` stored as a string in form state to allow an empty value (omitted from payload when blank). Bundles/Reviews pages are intentionally minimal stubs — no nav links added to sidebar since they're Phase 2 features.
- **Notes:** typecheck clean. Next: M1.29 Quality pass (toasts, validation messages, security, RTL/responsive QA).

## 2026-06-19 — M1.27: Newsletter admin UI

- **Done:**
  - `src/features/admin/newsletter/NewsletterPage.tsx` — 3-tab layout:
    - **Subscribers tab**: paginated table (email, name, language badge with flag, date, active/inactive pill); search, language filter, active filter, per-page selector (10/25/50), CSV export (raw fetch + Blob download to bypass JSON wrapper); loading skeleton + error state
    - **Send Newsletter tab**: target audience radio (all / Hebrew only / English only) with live recipient count fetched from API; bilingual subject + body fields (2-col grid, `dir` attrs, flag labels); confirmation dialog with recipient count; success/error banners; form resets after successful send
    - **History tab**: chronological list of past sends showing Hebrew subject, English subject, date, recipient count, target language badge; loading skeleton + empty state
  - `src/app/(admin)/admin/newsletter/page.tsx` — thin Server Component wrapper
- **Roadmap:** M1.27 ✅
- **Decisions:** SubscriberDTO and NewsletterSendDTO redeclared in the client component (server-only service types can't cross the boundary). CSV export uses raw `fetch` with `Authorization` header + `URL.createObjectURL` to trigger the browser download. Recipient count is fetched live (pageSize=1, isActive=true, language filter) on tab mount and target language change.
- **Notes:** typecheck + lint clean (zero new warnings). Next: M1.28 Remaining admin (gallery, settings, bundle/review shells).

## 2026-06-19 — M1.26: Site Content + Email Services UI

- **Done:**
  - `src/features/admin/site-content/SiteContentPage.tsx` — 6-tab layout (Hero, Story, About, Contact, FAQ, Gallery); per-section save via `PUT /api/admin/site-content/:key`; bilingual field pairs with explicit `dir` attrs; FAQ tab has dynamic add/remove/reorder (ArrowUp/ArrowDown) of Q&A pairs; 3-sec inline success feedback per section
  - `src/features/admin/email-services/EmailServicesPage.tsx` — sender config (PUT), test-send (POST), read-only provider info card
  - Page wrappers at `/admin/content`, `/admin/email`, `/admin/site-content`, `/admin/email-services`
- **Roadmap:** M1.26 ✅
- **Decisions:** `useSaveSection` local hook reused across all 6 content keys. FAQ mutations are local-only until explicit save. Sidebar links were already wired at `/admin/content` and `/admin/email` — duplicate wrappers created for canonical paths.
- **Notes:** typecheck clean. Next: M1.27 Newsletter UI.

## 2026-06-19 — M1.25: Coupons management UI

- **Done:**
  - `src/features/admin/coupons/CouponsListPage.tsx` — table with code/status/per-page filters, optimistic toggle-active (Power icon hits `PATCH /toggle`), pagination, soft-delete confirmation dialog
  - `src/features/admin/coupons/CouponFormPage.tsx` — create/edit form; three sections (coupon details, usage limits, special options); code auto-uppercase; `%`/`₪` suffix on discount value; read-only `usedCount` in edit mode; redirect to `/admin/coupons` on save
  - `src/app/(admin)/admin/coupons/page.tsx`, `new/page.tsx`, `[id]/edit/page.tsx` — thin Server Component wrappers
- **Roadmap:** M1.25 ✅
- **Decisions:** No tabs needed (coupons are simpler than products); `await params` pattern used in Next.js 15 edit page; sidebar nav was already wired.
- **Notes:** typecheck clean. Next: M1.26 Site Content + Email Services UI.

## 2026-06-19 — M1.9: Admin backend route handlers

- **Done:** 7 new services + 18 route files covering all remaining admin API surface:
  - Coupons CRUD (`/api/admin/coupons` + `[id]` + `[id]/toggle`) with all coupon-type fields
  - Site Content GET-all + per-key GET/PUT (`/api/admin/site-content`, `[key]`)
  - Email Settings GET/PUT + test-send (`/api/admin/email-settings`, `test`)
  - Newsletter subscriber list + CSV export + send + send history (`/api/admin/newsletter`, `send`, `sends`)
  - Gallery CRUD + FAQ CRUD — backed by SiteContent JSON blobs (no dedicated DB model in schema)
  - Settings GET/PUT — business info + shipping costs via SiteContent `settings` key
  - Phase-2 stubs: `/admin/bundles` (GET `[]` / POST 501), `/admin/reviews` (GET paginated list + PATCH approve/reject)
  - New Zod schemas added to `src/shared/schemas/index.ts`
- **Roadmap:** M1.9 ✅
- **Decisions:** Gallery and FAQ have no dedicated Prisma models — stored as JSON arrays in SiteContent (matches the existing public `/api/gallery` + `/api/faq` pattern). Newsletter CSV triggered by `?export=csv` query param on the GET list endpoint.
- **Notes:** typecheck clean; 17 pricing tests still green. Next: M1.25 Coupons management UI.

## 2026-06-18 — M1.24: Products CRUD UI

- **Done:**
  - `src/app/(admin)/admin/products/page.tsx` — list page
  - `src/app/(admin)/admin/products/new/page.tsx` — create page
  - `src/app/(admin)/admin/products/[id]/edit/page.tsx` — edit page
  - `src/features/admin/products/ProductsListPage.tsx` — products table with search, category filter, active/inactive filter, per-page selector (10/25/50), pagination, soft-delete confirmation dialog
  - `src/features/admin/products/ProductFormPage.tsx` — 5-tab form: Basic Info, Variants (dynamic rows), Pricing Rule (custom dimensions), Colors (connect/create), Images (upload, reorder, set primary)
  - `src/app/api/admin/colors/route.ts` — GET list + POST create colors (needed for the colors tab)
- **Roadmap:** M1.24 ✅
- **Decisions:** Colors managed as a global `ColorOption` list (connect existing or create inline). Image upload hits `POST /api/admin/upload` directly with FormData + admin JWT. Pricing rule tab disabled with explanation when `customizable=false`.

---

## 2026-06-18 — M1.7, M1.8, M1.10: Misc public endpoints + admin product CRUD + storage

- **Done:**
  - M1.7 public endpoints: `POST /api/contact`, `POST /api/newsletter/subscribe`, `GET /api/gallery`, `GET /api/reviews/[productId]`, `GET /api/faq`
  - M1.8 admin product CRUD API: `GET/POST /api/admin/products`, `GET/PUT/DELETE /api/admin/products/[id]`, `POST /api/admin/upload`
  - M1.8 admin service: `src/server/services/adminProductService.ts` (list, get, create, update, soft-delete — all in Prisma transactions)
  - M1.10 storage abstraction: already existed — `src/server/providers/storage/` (`StorageProvider` interface + `CloudinaryStorageProvider` + `LocalStorageProvider` + factory `getStorageProvider`)
  - Updated `withApi` and `withAdmin` to pass through the Next.js route context (needed for dynamic `[id]` params)
- **Roadmap:** M1.7 ✅ / M1.8 ✅ / M1.10 ✅
- **Decisions:** gallery + FAQ served from `SiteContent` JSON blobs (no dedicated model). Contact form logs to console only (no DB model). Category enum cast at service boundary since Zod schemas use `string` for enum values.
- **Notes:** M1.24 (Products CRUD UI) is next — backend is ready.

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
