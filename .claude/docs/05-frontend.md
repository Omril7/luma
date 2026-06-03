# 05 — Frontend

Next.js **App Router** + React + TypeScript. Mobile-first. File-based routing under
`src/app/`. Client-side state via **Zustand**. Server Components fetch data directly (call
services / Prisma) where possible; Client Components use a thin API client for interactivity.

## Server vs Client Components (default posture)

- **Server Components by default.** Pages that just render catalog data (home, shop, product,
  legal, about, gallery, FAQ) render on the server for SEO and fast first paint. They can read
  data directly from `src/server/services/*` (no HTTP round-trip).
- **Client Components (`'use client'`)** for anything interactive/stateful: the price
  calculator, cart, variant/dimension inputs, language switcher, a11y widget, forms, toasts.
- Keep `src/server/**` out of client bundles — only Server Components / route handlers /
  server actions import it.

## Routing & pages (storefront)

All UI lives under the `[lang]` locale segment (`/he/...`, `/en/...`); the segment sets
`<html lang dir>` and feeds next-intl. Paths below are relative to `/[lang]`.

| Route | Page | Notes |
|---|---|---|
| `/` | Home | Hero + CTA, featured products grid, "Our Story" teaser, testimonials (placeholder), Instagram (placeholder). |
| `/shop` | Catalog | Category filter, sort (price/newest/name), responsive product cards ("from ₪X"). |
| `/product/[slug]` | Product Detail | **Core page.** Gallery (swipeable mobile), variant selector w/ dims, custom-dimension toggle + inputs w/ min/max, **live price**, color swatches, qty, add-to-cart, related products. |
| `/cart` | Cart | Items w/ thumbnails + variant/custom info, qty +/-, coupon input, subtotal/shipping/discount/total, checkout CTA. |
| `/checkout` | Checkout | Customer info, shipping vs pickup, order summary sidebar, "Pay with Credit Card" (stub), installments, terms checkbox. |
| `/order-confirmation/[id]` | Confirmation | Thank-you, order number, summary, delivery timeframe. |
| `/about` | About | Craftsman story, workshop photos, philosophy. |
| `/gallery` | Gallery | Masonry/grid of past work, lightbox. |
| `/contact` | Contact | Form, WhatsApp link, optional Maps embed, hours. |
| `/faq` | FAQ | Accordion, bilingual. |
| `/terms`, `/privacy`, `/returns` | Legal | Bilingual, placeholder content phase 1. |
| `/admin/*` | Admin | Separate layout + auth guard. See `08-admin-panel.md`. |

## Layouts (App Router `layout.tsx`)

- **Root `app/layout.tsx`** — minimal shell.
- **`app/[lang]/layout.tsx` (StorefrontLayout)** — sets `lang`/`dir`, next-intl provider, header
  (logo, nav, language switcher, cart badge), footer, floating WhatsApp button, accessibility
  widget. Wraps all public pages.
- **`app/[lang]/admin/layout.tsx` (AdminLayout)** — sidebar nav + top bar; guards on auth.

## Component taxonomy

- `components/` — generic, presentational, reusable (Button, Input, Modal, Accordion,
  ImageGallery, PriceTag, Toast, Spinner, LanguageSwitcher, WhatsAppButton, A11yWidget).
- `features/<domain>/` — domain-grouped: `products/`, `cart/`, `checkout/`, `admin/`. Each
  holds its components, hooks, and store-slice usage.
- Route segments (`app/[lang]/**`) are thin: compose features + components, do data loading in
  the server component, keep logic minimal.

## Motion / animations

Wrap UI elements with `motion/react` (Framer Motion) for small, tasteful animations:
- Most interactive elements — buttons, cards, product tiles, drawers, modals — should use
  `motion.*` with hover/tap/enter variants.
- List reorders (cart items, gallery) use `layout` prop for smooth position transitions.
- Entrance transitions use `<AnimatePresence>` (cart drawer open/close, image lightbox).
- All motion must respect `prefers-reduced-motion` and the **reduce-motion** toggle in `uiStore`.

## Reviews carousel

The reviews section (phase 2 UI, model exists in phase 1) uses **embla-carousel**:
- `features/reviews/ReviewsCarousel.tsx` — embla-carousel-react with prev/next buttons and
  dot indicators.
- RTL-aware: pass `{ direction: locale === 'he' ? 'rtl' : 'ltr' }` to `useEmblaCarousel`.
- Autoplay optional; must pause on hover/focus.

## Zustand stores (`src/stores/`, client-only)

- **cartStore** — `items[]` (productId, variantId|custom dims, colorId, qty, snapshot of
  computed unitPrice + display info), `addItem`, `updateQty`, `removeItem`, `clear`,
  derived `subtotal`. Persisted to `localStorage`. Coupon/discount state for the cart.
- **languageStore** — current language (`he`/`en`), `setLanguage`. Default `he`. The active
  locale is primarily driven by the `[lang]` route segment + next-intl; this store mirrors it
  for client widgets and persists the user's preference. See `06-i18n-rtl.md`.
- **uiStore** — transient UI: modals, drawers, toasts, accessibility settings (font scale,
  high contrast). Accessibility prefs persisted.

> Persisted client stores must be hydrated safely in Next (guard against SSR/CSR mismatch — e.g.
> read `localStorage` only after mount). Cart line prices are computed via `src/shared/pricing.ts`
> (live) and **re-validated server-side** at checkout. Never trust the persisted client price as
> final — see `03-pricing-engine.md`.

## API client (`src/lib/api.ts`)

- Thin `fetch` wrapper used by **Client Components**: same-origin `/api`, JSON, attaches the
  admin JWT when present, parses the error envelope from `04-api-contract.md` and throws typed
  errors.
- Per-resource modules (`api.products`, `api.orders`, …).
- **Server Components** should prefer calling services in `src/server/services/*` directly
  instead of fetching their own API over HTTP.

## Product Detail — the critical interaction

1. Server Component loads the product by slug (variants, colors, images, pricing rule) and
   renders the static shell + SEO meta.
2. A Client Component handles interaction: toggle between **standard variant** (buttons showing
   dims) and **custom dimensions** (width/height/depth inputs with min/max from the rule).
3. On every change, recompute price locally via `src/shared/pricing.ts` and display instantly,
   optionally with a surcharge breakdown.
4. (Optional safety) debounce a call to `POST /api/products/:id/calculate-price` to confirm.
5. Add to cart stores the selection + computed price snapshot.

## Wishlist

- Persisted in `localStorage` (no login required); shareable via URL query param
  (`?wishlist=<ids>`).
- **wishlistStore** (Zustand, persisted): `items[]` (productId), `toggle`, `has`, `clear`.
- Heart-icon toggle on product cards (Catalog page) and the Product Detail page.
- Dedicated `/wishlist` page: list of saved products with add-to-cart per item.
- SSR-safe hydration guard (same pattern as `cartStore`).

## Product comparison

- Select 2–3 products to compare side by side (dimensions, price, materials, colors).
- **compareStore** (Zustand, session-only — not persisted): `items[]` (max 3), `toggle`, `clear`.
- Floating "Compare (N)" bar appears at the bottom of screen when ≥1 product is selected.
- `/compare` page: side-by-side table of selected products — image, name, price, dimensions per variant, materials, colors available.
- Compare toggle button on product cards; deselect on the compare page or via the floating bar.

## Product Detail — sticky add-to-cart bar (mobile)

After the user scrolls past the buy box (the section with variant/price/qty/add-to-cart), a
sticky bar slides in at the bottom on mobile (`md:hidden`):
- Shows: product name (truncated), current computed price, **"Add to Cart"** button.
- Uses the same cart logic as the main buy box — no duplicate state.
- Hides again when the buy box scrolls back into view (IntersectionObserver).

## SEO, performance, accessibility

- **SEO:** Next.js Metadata API (`export const metadata` / `generateMetadata`) for per-page
  title/description/OG, bilingual, with the right `lang`. Product pages get product-specific
  metadata; server rendering means crawlers see real content.
- **Performance:** Server Components + automatic per-route code-splitting; `next/image` for
  responsive, lazy-loaded, optimized images; defer non-critical sections
  (testimonials/Instagram placeholders).
- **Accessibility:** the legally-required widget (font size, contrast) lives in the storefront
  layout; see `07-design-system.md`. Semantic HTML, focus management, alt text from
  `ProductImage.altText_he/_en`.
- **Errors/feedback:** toast notifications for API errors/success, mapped from the server error
  envelope.
