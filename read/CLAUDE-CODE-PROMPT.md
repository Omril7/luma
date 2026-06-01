# 🪵 Custom Furniture E-Commerce Website — Project Brief

## Overview

Build a full-stack e-commerce website for a custom furniture business. The site sells handmade furniture with standard variants (S/M/L) and a custom-dimensions option with auto-calculated pricing. The site must support Hebrew (RTL) + English, be warm/natural in aesthetic, and include a full shopping cart + credit card checkout flow.

This is an evolving project — architect everything to be modular and extensible. Not all features will be built in phase 1, but the foundation should support them all.

---

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS (with RTL support via `tailwindcss-rtl` or logical properties)
- **State Management:** Zustand (for cart, language, UI state)
- **Routing:** React Router v6+
- **i18n:** react-i18next (Hebrew + English, RTL/LTR auto-switching)
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Auth (Admin):** JWT-based authentication for admin panel
- **Payments:** Integration-ready for Israeli payment processors (Meshulam / Tranzila / PayPlus — stub the interface for now, we'll pick one later)
- **File Storage:** Cloudinary or local uploads (configurable)
- **Deployment:** Docker + docker-compose for dev, production deployment TBD

---

## Project Structure

```
/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page-level components
│   │   ├── layouts/           # Layout wrappers (StorefrontLayout, AdminLayout)
│   │   ├── features/          # Feature modules (cart, products, checkout, etc.)
│   │   ├── hooks/             # Custom hooks
│   │   ├── stores/            # Zustand stores
│   │   ├── i18n/              # Translation files (he.json, en.json)
│   │   ├── lib/               # Utils, API client, helpers
│   │   ├── types/             # Shared TypeScript types
│   │   └── styles/            # Global styles, Tailwind config
│   └── ...
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/            # API route handlers
│   │   ├── controllers/       # Business logic
│   │   ├── services/          # Service layer (pricing engine, payment, email)
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── prisma/            # Prisma schema + migrations
│   │   └── types/             # Server-side types
│   └── ...
├── shared/                    # Shared types/constants between client & server
├── docker-compose.yml
└── README.md
```

---

## Core Data Models (Prisma Schema)

Design the database with these entities:

### Product
- `id`, `slug`, `name_he`, `name_en`, `description_he`, `description_en`
- `category` (enum: TABLE, SHELF, CONSOLE, SHOE_RACK, NIGHTSTAND, ARMCHAIR, TV_STAND, BENCH, OTHER)
- `basePrice` (decimal)
- `images` (relation to ProductImage)
- `variants` (relation to ProductVariant)
- `customizable` (boolean — does this product support custom dimensions?)
- `customPricingRule` (relation to CustomPricingRule, nullable)
- `colorOptions` (relation to ColorOption)
- `isActive`, `isFeatured`, `sortOrder`
- `createdAt`, `updatedAt`

### ProductVariant
- `id`, `productId`, `name_he`, `name_en` (e.g., "S", "M", "L")
- `width`, `height`, `depth`, `diameter` (nullable decimals, in cm)
- `price` (decimal — the fixed price for this variant)
- `sku`, `isActive`

### CustomPricingRule
- `id`, `productId`
- `basedOnVariant` (which variant size tier to use as the base price reference)
- `pricePerCmWidth` (decimal, nullable)
- `pricePerCmHeight` (decimal, nullable)
- `pricePerCmDepth` (decimal, nullable)
- `pricePerCmDiameter` (decimal, nullable)
- `minWidth`, `maxWidth`, `minHeight`, `maxHeight`, `minDepth`, `maxDepth` (nullable constraints)

### ColorOption
- `id`, `name_he`, `name_en`, `hexCode`, `imageUrl` (swatch), `isActive`
- Many-to-many with Product

### ProductImage
- `id`, `productId`, `url`, `altText_he`, `altText_en`, `sortOrder`, `isPrimary`

### Order
- `id`, `orderNumber` (human-readable, auto-generated)
- `customerName`, `customerEmail`, `customerPhone`
- `shippingAddress` (JSON or structured fields)
- `shippingMethod` (enum: NATIONAL_SHIPPING, PICKUP)
- `items` (relation to OrderItem)
- `subtotal`, `shippingCost`, `discount`, `total` (decimals)
- `couponCode` (nullable)
- `paymentStatus` (enum: PENDING, PAID, FAILED, REFUNDED)
- `orderStatus` (enum: RECEIVED, IN_PRODUCTION, READY, SHIPPED, DELIVERED, CANCELLED)
- `installments` (integer, nullable — number of payments)
- `notes`, `language` (he/en — which language the customer used)
- `createdAt`, `updatedAt`

### OrderItem
- `id`, `orderId`, `productId`, `variantId` (nullable)
- `isCustom` (boolean)
- `customWidth`, `customHeight`, `customDepth`, `customDiameter` (nullable)
- `selectedColor` (relation to ColorOption, nullable)
- `quantity`, `unitPrice`, `totalPrice`

### Coupon
- `id`, `code` (unique string)
- `discountType` (enum: PERCENTAGE, FIXED_AMOUNT)
- `discountValue` (decimal)
- `minOrderAmount` (nullable), `maxUses` (nullable), `usedCount`
- `validFrom`, `validUntil` (nullable), `isActive`

### Bundle (phase 2, but create the model now)
- `id`, `name_he`, `name_en`, `description_he`, `description_en`
- `products` (relation — which products are in the bundle)
- `bundlePrice` (decimal — the discounted total)
- `isActive`

### NewsletterSubscriber
- `id`, `email`, `name`, `language`, `subscribedAt`, `isActive`

### Review (phase 2, but create the model now)
- `id`, `productId`, `customerName`, `rating` (1-5), `comment_he`, `comment_en`
- `isApproved` (admin must approve), `createdAt`

---

## Pricing Engine (Critical Business Logic)

Build a dedicated `PricingService` class in `server/src/services/pricingService.ts`:

```
calculatePrice(productId, options):
  1. If user selected a standard variant → return variant.price
  2. If user entered custom dimensions:
     a. Find the closest variant tier (S/M/L) that fits as the "base"
        — the variant whose dimensions are closest-but-smaller
     b. Take that variant's price as basePrice
     c. Calculate the delta in each dimension (custom - variant)
     d. Multiply deltas by the per-cm rates from CustomPricingRule
     e. Return basePrice + sum of all dimension surcharges
  3. Apply color surcharge (currently none, but keep the hook)
  4. Return final price
```

This must run on BOTH client (for real-time preview) and server (for validation). Put the pure calculation logic in `/shared/pricing.ts` and import it in both.

---

## Pages to Build

### Storefront (public)

1. **Home Page** (`/`)
   - Hero section with a strong image/CTA
   - Featured products grid (admin-selectable)
   - "Our Story" teaser section
   - Customer testimonials section (phase 2 content, build the UI now with placeholder)
   - Instagram feed section (phase 2, placeholder)

2. **Catalog/Shop Page** (`/shop`)
   - Filter by category (sidebar or top bar)
   - Sort by price, newest, name
   - Product cards with primary image, name, starting price ("from ₪X")
   - Responsive grid

3. **Product Detail Page** (`/product/:slug`)
   - Image gallery (swipeable on mobile)
   - Product name, description
   - Variant selector (S/M/L buttons with dimensions shown)
   - "Custom Dimensions" toggle that reveals width/height/depth inputs
     - Show min/max constraints
     - Real-time price calculation as user types
   - Color/finish picker (visual swatches)
   - Quantity selector
   - "Add to Cart" button
   - Related products section

4. **Cart Page** (`/cart`)
   - List of items with thumbnails, variant info, custom dimensions if applicable
   - Quantity +/- controls
   - Coupon code input field
   - Subtotal, shipping estimate, discount line, total
   - "Proceed to Checkout" button

5. **Checkout Page** (`/checkout`)
   - Customer info form (name, email, phone)
   - Shipping address OR pickup selection
   - Order summary sidebar
   - Payment integration placeholder (show a "Pay with Credit Card" button that will connect to the payment processor)
   - Installments selection (if supported by processor)
   - Terms & conditions checkbox (link to policy pages)

6. **Order Confirmation Page** (`/order-confirmation/:id`)
   - Thank you message, order number, summary
   - Expected delivery timeframe

7. **About Page** (`/about`)
   - The craftsman's story, workshop photos, philosophy

8. **Gallery/Portfolio Page** (`/gallery`)
   - Masonry or grid layout of past work
   - Lightbox on click

9. **Contact Page** (`/contact`)
   - Contact form (name, email, phone, message)
   - WhatsApp link
   - Google Maps embed (optional)
   - Business hours

10. **FAQ Page** (`/faq`)
    - Accordion-style Q&A
    - Bilingual content

11. **Legal Pages** (`/terms`, `/privacy`, `/returns`)
    - Return/exchange policy
    - Privacy policy
    - Terms of service
    - All bilingual

### Admin Panel (`/admin/...`)

Build a clean, functional admin dashboard. Not customer-facing, so design can be simpler but still polished.

1. **Dashboard** — order count, revenue summary, recent orders
2. **Products CRUD** — create/edit/delete products, variants, pricing rules, upload images, manage colors
3. **Orders Management** — view all orders, filter by status, update status, view details
4. **Coupons Management** — create/edit/deactivate coupons
5. **Bundles Management** (phase 2 — build the page shell)
6. **Reviews Moderation** (phase 2 — build the page shell)
7. **Newsletter Subscribers** — view list, export CSV
8. **Settings** — business info, shipping costs, general config
9. **Gallery Management** — upload/reorder/delete portfolio images

---

## i18n & RTL Requirements

- Default language: Hebrew (RTL)
- Secondary: English (LTR)
- Language switcher in the header (toggles `dir` attribute on `<html>`)
- ALL user-facing text must come from translation files, never hardcoded
- All product content has `_he` and `_en` fields
- Use Tailwind logical properties (`ps-4` instead of `pl-4`, `ms-2` instead of `ml-2`) or the RTL plugin
- Legal pages need full bilingual content

---

## Design Direction

**Aesthetic:** Warm, natural, rustic-modern. Think wood textures, earthy tones, cozy feeling.

**Color Palette (starting point, configurable via CSS variables):**
- Primary: warm wood brown (`#8B6914` range)
- Secondary: cream/beige (`#F5F0E8` range)
- Accent: terracotta or burnt orange
- Text: dark brown/charcoal
- Background: warm off-white
- Make ALL colors configurable via CSS custom properties so they can be easily changed later

**Typography:**
- Hebrew: "Heebo" or "Rubik" (Google Fonts, good RTL support)
- English: pair with a complementary Latin font
- Use font variables so they're swappable

**General UI:**
- Rounded corners, soft shadows
- Generous whitespace
- High-quality image presentation (images are the selling point)
- Mobile-first responsive design
- Smooth transitions/animations (subtle, not flashy)
- Floating WhatsApp button (bottom-left for RTL, configurable phone number)
- Accessibility button/widget (can use a library like `react-accessibility` or build a simple one with font-size/contrast toggles) — this is legally required in Israel

---

## API Endpoints (REST)

### Public
- `GET /api/products` — list with filters (category, featured, active)
- `GET /api/products/:slug` — single product with variants, colors, pricing rules
- `POST /api/products/:id/calculate-price` — calculate custom price (server-side validation)
- `GET /api/categories` — list active categories
- `POST /api/orders` — create order
- `GET /api/orders/:id` — get order details (by order ID, for confirmation page)
- `POST /api/orders/:id/apply-coupon` — validate and apply coupon
- `POST /api/contact` — submit contact form
- `POST /api/newsletter/subscribe` — subscribe to newsletter
- `GET /api/gallery` — portfolio images
- `GET /api/reviews/:productId` — approved reviews for a product
- `GET /api/faq` — FAQ items

### Admin (authenticated)
- Full CRUD for: products, variants, pricing rules, colors, orders, coupons, bundles, reviews, gallery, FAQ, newsletter
- `POST /api/admin/auth/login` — admin login
- `GET /api/admin/dashboard/stats` — dashboard metrics
- `POST /api/admin/upload` — image upload

---

## Phase Plan

### Phase 1 (MVP — build now)
- Full project setup with all the tooling
- Database schema with ALL models (including phase 2 ones)
- Product catalog with variants + custom pricing engine
- Product pages with real-time custom price calculator
- Cart with coupon support
- Checkout flow (payment processor stubbed)
- i18n (Hebrew + English) with full RTL support
- Admin panel for products, orders, coupons
- Contact page with WhatsApp button
- FAQ page
- Legal pages (placeholder content)
- Accessibility widget
- SEO meta tags (react-helmet-async)
- Responsive design (mobile-first)
- Seed script with sample data for development

### Phase 2 (post-launch)
- Payment processor integration (Meshulam/Tranzila/PayPlus)
- Bundles with admin-set bundle pricing
- Customer reviews with admin moderation
- Instagram feed integration
- Newsletter system (connect to Mailchimp/SendGrid)
- Google Analytics integration
- Gallery management in admin
- Order notification emails
- Advanced shipping calculator (by region)

---

## Important Dev Notes

1. **Seed Data:** Create a comprehensive seed script (`prisma/seed.ts`) with 3-4 sample products across different categories, each with S/M/L variants, custom pricing rules, and color options. This is essential for development.

2. **Validation:** Use Zod for request validation on both client and server. Define schemas in `/shared/`.

3. **Error Handling:** Global error handler middleware on the server. Toast notifications on the client.

4. **Image Handling:** Products need multiple images. For now, support local file upload to a `/uploads` directory. Abstract behind an interface so we can swap to Cloudinary later.

5. **Environment Config:** Use `.env` files. Document ALL required env vars in `.env.example`.

6. **Mobile First:** Design for mobile first, then scale up. The customer base will primarily browse on phones.

7. **Performance:** Lazy-load images, code-split routes, optimize bundle size.

8. **Security:** Sanitize all inputs, parameterized queries (Prisma handles this), rate limiting on public endpoints, CORS configuration.

---

## Getting Started

1. Initialize the monorepo with the folder structure above
2. Set up the Prisma schema with all models
3. Create the Express server with basic middleware
4. Set up the React app with Vite, Tailwind, i18n, and routing
5. Build the shared pricing engine
6. Create the seed script
7. Build pages iteratively: Home → Shop → Product Detail → Cart → Checkout
8. Build admin panel in parallel

Start with the project scaffolding + database schema + seed data, then move to the product detail page with the custom pricing calculator — that's the core differentiator of this site.
