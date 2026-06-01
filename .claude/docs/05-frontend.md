# 05 — Frontend

React + TypeScript + Vite. Mobile-first. Routing via React Router v6+. State via Zustand.
Data fetching through a thin API client in `client/src/lib/api.ts`.

## Routes & pages (storefront)

| Route | Page | Notes |
|---|---|---|
| `/` | Home | Hero + CTA, featured products grid, "Our Story" teaser, testimonials (placeholder), Instagram (placeholder). |
| `/shop` | Catalog | Category filter, sort (price/newest/name), responsive product cards ("from ₪X"). |
| `/product/:slug` | Product Detail | **Core page.** Gallery (swipeable mobile), variant selector w/ dims, custom-dimension toggle + inputs w/ min/max, **live price**, color swatches, qty, add-to-cart, related products. |
| `/cart` | Cart | Items w/ thumbnails + variant/custom info, qty +/-, coupon input, subtotal/shipping/discount/total, checkout CTA. |
| `/checkout` | Checkout | Customer info, shipping vs pickup, order summary sidebar, "Pay with Credit Card" (stub), installments, terms checkbox. |
| `/order-confirmation/:id` | Confirmation | Thank-you, order number, summary, delivery timeframe. |
| `/about` | About | Craftsman story, workshop photos, philosophy. |
| `/gallery` | Gallery | Masonry/grid of past work, lightbox. |
| `/contact` | Contact | Form, WhatsApp link, optional Maps embed, hours. |
| `/faq` | FAQ | Accordion, bilingual. |
| `/terms`, `/privacy`, `/returns` | Legal | Bilingual, placeholder content phase 1. |
| `/admin/*` | Admin | Separate layout + auth. See `08-admin-panel.md`. |

## Layouts

- `StorefrontLayout` — header (logo, nav, language switcher, cart badge), footer, floating
  WhatsApp button, accessibility widget. Sets page chrome for all public pages.
- `AdminLayout` — sidebar nav + top bar, guards on auth.

## Component taxonomy

- `components/` — generic, presentational, reusable (Button, Input, Modal, Accordion,
  ImageGallery, PriceTag, Toast, Spinner, LanguageSwitcher, WhatsAppButton, A11yWidget).
- `features/<domain>/` — domain-grouped: `products/`, `cart/`, `checkout/`, `admin/`. Each
  holds its components, hooks, and store slice usage.
- `layouts/` — the two layouts above.
- `pages/` — route targets; compose features + components; minimal logic.

## Zustand stores (`client/src/stores/`)

- **cartStore** — `items[]` (productId, variantId|custom dims, colorId, qty, snapshot of
  computed unitPrice + display info), `addItem`, `updateQty`, `removeItem`, `clear`,
  derived `subtotal`. Persisted to `localStorage`. Coupon/discount state for the cart.
- **languageStore** — current language (`he`/`en`), `setLanguage` (also flips `<html dir>` and
  i18next). Default `he`. Persisted. See `06-i18n-rtl.md`.
- **uiStore** — transient UI: modals, drawers, toasts, accessibility settings (font scale,
  high contrast). Accessibility prefs persisted.

> Cart line prices are computed via `shared/pricing.ts` (live) and **re-validated server-side**
> at checkout. Never trust the persisted client price as final — see `03-pricing-engine.md`.

## API client (`client/src/lib/api.ts`)

- Thin `fetch` wrapper: base URL from env, JSON, attaches admin JWT when present, parses the
  error envelope from `04-api-contract.md` and throws typed errors.
- Per-resource modules (`api.products`, `api.orders`, …). Consider React Query later; phase 1
  can use store actions + the client directly.

## Product Detail — the critical interaction

1. Load product by slug (variants, colors, images, pricing rule).
2. User toggles between **standard variant** (buttons showing dims) and **custom dimensions**
   (width/height/depth inputs with min/max from the rule).
3. On every change, recompute price locally via `shared/pricing.ts` and display instantly,
   optionally with a surcharge breakdown.
4. (Optional safety) debounce a call to `POST /products/:id/calculate-price` to confirm.
5. Add to cart stores the selection + computed price snapshot.

## SEO, performance, accessibility

- **SEO:** `react-helmet-async` for per-page title/description/OG tags, bilingual, with the
  right `dir`/`lang`. Product pages get product-specific meta.
- **Performance:** route-based code-splitting (`React.lazy`), lazy-load images, optimize
  bundle, defer non-critical sections (testimonials/Instagram placeholders).
- **Accessibility:** the legally-required widget (font size, contrast) lives in
  `StorefrontLayout`; see `07-design-system.md`. Semantic HTML, focus management, alt text
  from `ProductImage.altText_he/_en`.
- **Errors/feedback:** toast notifications for API errors/success, mapped from the server
  error envelope.
