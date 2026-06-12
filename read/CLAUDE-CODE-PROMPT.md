# 🪵 Custom Furniture E-Commerce Website — Project Brief

> **Note:** This is the living project brief, kept in sync with `.claude/docs/`. Stack decisions
> have evolved since initial drafting — the authoritative source of truth is always `.claude/docs/`
> and `CLAUDE.md`. This file reflects the current agreed architecture.

## Overview

Build a full-stack e-commerce website for a custom furniture business. The site sells handmade
furniture with standard variants (S/M/L) and a custom-dimensions option with auto-calculated
pricing. The site must support Hebrew (RTL) + English, be warm/natural in aesthetic, and include
a full shopping cart + credit card checkout flow.

This is an evolving project — architect everything to be modular and extensible. Not all features
will be built in phase 1, but the foundation should support them all.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Next.js (App Router) + React + TypeScript** — one app for UI **and** API |
| Styling | Tailwind CSS (logical properties for RTL) |
| Animations | **motion/react** (Framer Motion v11+) — subtle, purposeful UI animations |
| State | Zustand (cart, language, UI) — client components only |
| Routing | Next.js App Router (`[lang]` locale segment for he/en) |
| i18n | **next-intl** (he + en, RTL/LTR auto-switch, SSR-friendly) |
| Backend | Next.js **Route Handlers** (`src/app/api/**`) |
| Database | PostgreSQL (**Supabase**) + Prisma ORM |
| Auth (Admin) | JWT-based |
| Payments | Stubbed `PaymentProvider` interface (provider TBD — phase 2) |
| File Storage | **Cloudinary** (primary; local fallback for offline dev) |
| Email | **Nodemailer** (SMTP); `ConsoleEmailProvider` stub in dev |
| Deploy | **Vercel** (production + staging; no Docker needed) |

**Single Next.js app at the repo root** — no workspaces/monorepo. Framework-free shared logic
(pricing, validation, types) lives in `src/shared/`. The backend is Route Handlers, not a
separate Express server.

---

## Project Structure

```
/
├── src/
│   ├── app/                      # App Router
│   │   ├── layout.tsx            # root layout
│   │   ├── [lang]/               # he|en locale segment
│   │   │   ├── (storefront)/     # home, shop, product/[slug], cart, checkout, about, gallery…
│   │   │   └── admin/            # admin pages (own layout + JWT auth guard)
│   │   └── api/                  # Route Handlers = the backend
│   ├── components/               # Reusable, presentational UI components
│   ├── features/                 # Feature modules: cart/, products/, checkout/, admin/
│   ├── hooks/                    # Custom React hooks (client)
│   ├── stores/                   # Zustand stores (cart, language, ui) — client components
│   ├── i18n/                     # next-intl config + he.json, en.json
│   ├── lib/                      # API client (typed, error-envelope aware), utils, helpers
│   ├── server/                   # SERVER-ONLY backend internals:
│   │   ├── prisma.ts             #   Prisma client singleton
│   │   ├── services/             #   pricingService, orderService, emailService…
│   │   ├── providers/            #   PaymentProvider, StorageProvider, EmailProvider
│   │   ├── auth/                 #   JWT issue/verify, admin guard
│   │   └── http/                 #   error envelope, Zod validation helpers, rate limiter
│   ├── shared/                   # FRAMEWORK-FREE (no React/Next/Prisma imports):
│   │   ├── pricing.ts            #   pure pricing functions + pricing.test.ts
│   │   ├── schemas/              #   Zod schemas (orders, products, contact, coupons…)
│   │   ├── constants.ts          #   enums, categories, shipping methods
│   │   └── types.ts              #   shared DTOs/types
│   ├── styles/                   # globals.css, Tailwind layer, theme CSS variables
│   └── types/                    # Frontend-only types
├── prisma/                       # schema.prisma, migrations, seed.ts
├── public/
├── next.config.ts
├── tsconfig.json
├── package.json                  # ONE package.json
├── .env.example
└── README.md
```

---

## Core Data Models (Prisma Schema)

See `.claude/docs/02-data-models.md` for full detail. All phase-2 models (`Bundle`, `Review`)
are created in phase 1 — their UIs are deferred.

> **Shared DB note:** The `Order` and `Product` tables are also accessed by the companion
> **luma-manager** app (`C:\Users\omril\Projects\luma-manager`), which handles order
> fulfillment management. This app creates orders and products; luma-manager reads/updates them.
> Both apps point at the same Supabase Postgres instance.

### Product
- `id`, `slug`, `name_he`, `name_en`, `description_he`, `description_en`
- `category` (enum: TABLE, SHELF, CONSOLE, SHOE_RACK, NIGHTSTAND, ARMCHAIR, TV_STAND, BENCH, OTHER)
- `basePrice` (Decimal), `customizable` (Boolean)
- `isActive`, `isFeatured`, `sortOrder`, `createdAt`, `updatedAt`
- Relations: `images`, `variants`, `customPricingRule`, `colorOptions`, `reviews`, `bundles`

### ProductVariant
- `id`, `productId`, `name_he`, `name_en` (S/M/L labels)
- `width?`, `height?`, `depth?`, `diameter?` (Decimal, cm)
- `price` (Decimal), `sku`, `isActive`

### CustomPricingRule
- `id`, `productId` (unique), `basedOnVariantId?`
- `pricePerCmWidth?`, `pricePerCmHeight?`, `pricePerCmDepth?`, `pricePerCmDiameter?` (Decimal)
- `minWidth?`, `maxWidth?`, `minHeight?`, `maxHeight?`, `minDepth?`, `maxDepth?` (Decimal)

### ColorOption
- `id`, `name_he`, `name_en`, `hexCode`, `imageUrl?` (swatch), `isActive`
- Many-to-many with Product

### ProductImage
- `id`, `productId`, `url`, `altText_he`, `altText_en`, `sortOrder`, `isPrimary`

### Order *(created here, managed by luma-manager)*
- `id`, `orderNumber` (auto-generated), customer fields, `shippingAddress` (Json)
- `shippingMethod`, `subtotal`, `shippingCost`, `discount`, `total` (Decimal)
- `couponCode?`, `paymentStatus`, `orderStatus`, `installments?`, `notes?`, `language`
- Relations: `items OrderItem[]`

### OrderItem
- `id`, `orderId`, `productId`, `variantId?`, `isCustom`, custom dimensions, `selectedColorId?`
- `quantity`, `unitPrice`, `totalPrice` (snapshot prices — never recomputed)

### Coupon
- `id`, `code` (unique), `discountType` (PERCENTAGE | FIXED_AMOUNT)
- `discountValue` (Decimal), `minOrderAmount?`, `maxUses?`, `usedCount`
- `validFrom?`, `validUntil?` (deadline-code), `isActive`
- `singleUsePerCustomer` (Boolean) — each customer email can use it once
- `firstOrderOnly` (Boolean) — only applies to a customer's first order
- `autoApply` (Boolean) — applied automatically without entering a code

### Bundle *(phase 2 UI, model now)*
- `id`, `name_he`, `name_en`, `description_he`, `description_en`
- `products Product[]` (m-n), `bundlePrice` (Decimal), `isActive`

### NewsletterSubscriber
- `id`, `email` (unique), `name?`, `language` (Language), `subscribedAt`, `isActive`

### Review *(phase 2 UI, model now)*
- `id`, `productId`, `customerName`, `rating Int` (1–5), `comment_he?`, `comment_en?`
- `isApproved Boolean @default(false)`, `createdAt`

---

## Pricing Engine (Critical Business Logic)

Pure functions in `src/shared/pricing.ts` — framework-free, runs identically on client (live
price preview) and server (order validation). See `.claude/docs/03-pricing-engine.md`.

```
calculatePrice(product, variants, rule, options):
  1. Standard variant selected → return variant.price
  2. Custom dimensions:
     a. Validate each dimension against rule min/max
     b. Find the closest-but-smaller base variant tier
     c. basePrice = baseTier.price
     d. surcharge = Σ max(0, custom[d] - baseTier[d]) * pricePerCm[d]
     e. unitPrice = basePrice + surcharge
  3. colorSurcharge = 0 (hook reserved)
  4. totalPrice = unitPrice * quantity
```

---

## Pages to Build

### Storefront (public)

1. **Home Page** — hero + CTA, featured products grid, Our Story teaser, testimonials (phase 2), Instagram (phase 2)
2. **Catalog/Shop** — filter by category, sort, product cards with "from ₪X" price
3. **Product Detail** ⭐ — image gallery, variant selector, custom dimensions + live price, color swatches, add to cart; sticky mobile add-to-cart bar
4. **Cart** — items, qty +/-, coupon input, subtotal/shipping/total, checkout CTA
5. **Checkout** — customer info, shipping vs pickup, payment stub, installments, terms
6. **Order Confirmation** — thank you, order number, summary
7. **About** — craftsman story, workshop photos
8. **Gallery/Portfolio** — masonry grid, lightbox
9. **Contact** — form + WhatsApp button + hours
10. **FAQ** — bilingual accordion
11. **Legal** — terms / privacy / returns (bilingual placeholder content)
12. **Wishlist** — saved products, shareable via URL
13. **Comparison** — side-by-side up to 3 products

### Admin Panel (`/admin/...`)

Gated by JWT. Not customer-facing — simpler UI but still polished. Admin manages this
**e-commerce site only** (order fulfillment is handled by luma-manager).

1. **Login** — email/password
2. **Products CRUD** — create/edit/delete products, variants, pricing rules, images, colors
3. **Site Content** — edit all static/marketing page text (hero, About, FAQ, gallery intro, contact details) — bilingual, live immediately
4. **Email Services** — configure email sender settings (provider, from address, templates preview)
5. **Coupons** — full CRUD with all coupon types (one-time, permanent, deadline, per-customer, first-order, auto-apply)
6. **Newsletter** — view subscribers, compose & send newsletter emails (bilingual templates)
7. **Gallery** — upload/reorder/delete portfolio images
8. **Bundles** (phase 2 shell)
9. **Reviews** (phase 2 shell)

---

## i18n & RTL Requirements

- Default language: Hebrew (RTL)
- Secondary: English (LTR)
- Library: **next-intl** with `[lang]` route segment (`/he/...`, `/en/...`)
- ALL user-facing text from translation files — never hardcoded
- All content fields: `_he` and `_en`
- CSS: logical properties only (`ps-4`, `me-2`, `text-start`) — no `pl-`, `mr-`, `text-left`

---

## Design Direction

**Aesthetic:** Warm, natural, rustic-modern. Wood textures, earthy tones, cozy feeling.

**Color Palette (CSS custom properties — all swappable):**
- Primary: warm wood brown (`#8B6914`)
- Secondary: cream/beige (`#F5F0E8`)
- Accent: terracotta / burnt orange (`#C26B3D`)
- Text: dark brown/charcoal (`#2E2A24`)
- Background: warm off-white (`#FBF8F3`)

**Typography:** Heebo/Rubik (Hebrew), Inter (English), via `next/font`

**Animations:** `motion/react` (Framer Motion v11+) — subtle hover/tap/enter transitions;
`AnimatePresence` for modals/drawer; respect `prefers-reduced-motion`.

**Accessibility widget:** draggable (Framer Motion), font-size +/-, high-contrast toggle.
Legally required in Israel.

---

## Storage & Email

**Cloudinary** is the primary image storage provider. Configure via `CLOUDINARY_URL` env var.
Local disk (`STORAGE_DRIVER=local`) is an offline-only fallback for development without
internet. All image uploads go through the `StorageProvider` interface — call sites never
change when switching drivers.

**Email** is sent via **Nodemailer** (SMTP). Set `EMAIL_PROVIDER=nodemailer` and the SMTP
env vars for real sending. `EMAIL_PROVIDER=stub` logs to console in dev — no setup needed.

---

## API Endpoints (REST)

See `.claude/docs/04-api-contract.md` for full detail.

### Public
- `GET /api/products`, `GET /api/products/:slug`, `POST /api/products/:id/calculate-price`
- `GET /api/categories`
- `POST /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/apply-coupon`
- `POST /api/contact`, `POST /api/newsletter/subscribe`
- `GET /api/gallery`, `GET /api/reviews/:productId`, `GET /api/faq`

### Admin (JWT required)
- `POST /api/admin/auth/login`
- Products: full CRUD + image upload
- Site content: read/update blobs
- Coupons: full CRUD + activate/deactivate
- Newsletter: list subscribers, export CSV, `POST /api/admin/newsletter/send`
- Gallery: upload/reorder/delete
- Email settings: read/update provider config
- FAQ: full CRUD
- Settings: business info, shipping costs

## Development setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL, Cloudinary URL, JWT secret
npm run db:migrate
npm run db:seed
npm run dev                  # :3000 — UI + /api on one port
```

No Docker needed. Use a Supabase dev project for Postgres.

---

## Phase Plan

### Phase 1 (MVP — build now)
- Full project setup + all tooling
- Database schema with ALL models (including phase-2 ones)
- Product catalog + variants + custom pricing engine
- Product pages with live custom price calculator
- Cart with coupon support (all coupon types)
- Checkout flow (payment stubbed)
- i18n Hebrew + English, full RTL
- Admin: products, site content, coupons, newsletter (send), email services
- Contact + WhatsApp, FAQ, legal pages
- Accessibility widget (legally required in IL)
- SEO meta tags, responsive, seed data
- Wishlist + comparison pages

### Phase 2 (post-launch)
- Payment processor integration (Meshulam/Tranzila/PayPlus)
- Bundles with admin-set bundle pricing
- Customer reviews with admin moderation
- Instagram feed integration
- Newsletter system (connect to Mailchimp/SendGrid)
- Google Analytics integration
- Advanced shipping calculator (by region)
- Order notification emails (wire EmailProvider to SendGrid/SES)

---

## Important Dev Notes

1. **Shared DB:** `Order` and `Product` tables are shared with luma-manager. This app creates/manages them; luma-manager reads/updates order status. Both point at the same Supabase instance.
2. **Seed Data:** 3–4 products, S/M/L variants, pricing rules, colors, coupons of each type, newsletter subscribers, admin user.
3. **Validation:** Zod schemas in `src/shared/schemas/` — same schema on client form + server route handler.
4. **Money:** `Decimal` in DB, integer agorot in the pricing engine. Never raw JS floats.
5. **Mobile First:** customers browse primarily on phones.
6. **Security:** sanitize inputs, parameterized queries (Prisma), rate limiting, CORS, JWT from env.
