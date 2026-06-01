# 02 — Data Models (Prisma Schema)

Authoritative DB design. Lives in `prisma/schema.prisma`. All phase-2 models
(`Bundle`, `Review`) are created **now** even though their UIs come later.

## Key decisions

- **Money:** store as `Decimal @db.Decimal(10, 2)` (Prisma `Decimal`). Never `Float`. In the
  pricing engine, compute in **integer agorot** (₪1 = 100 agorot) to avoid float drift, then
  present as Decimal. Document any conversion at the boundary. Currency is ILS (₪).
- **Bilingual content:** every human-readable field is duplicated as `_he` and `_en`
  (e.g. `name_he`, `name_en`). Non-nullable for required content.
- **Soft delete / visibility:** prefer `isActive` flags over hard deletes for catalog data so
  orders keep referencing historical products/variants.
- **Dimensions:** centimeters, nullable `Decimal` (`width`, `height`, `depth`, `diameter`).
  Not every product uses every dimension (e.g. a round table uses `diameter`).
- **Address:** stored as structured JSON on `Order.shippingAddress` for flexibility; validate
  shape with Zod (`src/shared/schemas`).
- **Slugs:** `Product.slug` unique, URL-safe, generated from `name_en` (fallback `name_he`
  transliteration), stable once created.
- **Order numbers:** human-readable `orderNumber` (e.g. `ED-2026-00042`) generated on create,
  separate from the cuid `id`.

## Enums

```prisma
enum Category { TABLE SHELF CONSOLE SHOE_RACK NIGHTSTAND ARMCHAIR TV_STAND BENCH OTHER }
enum ShippingMethod { NATIONAL_SHIPPING PICKUP }
enum PaymentStatus { PENDING PAID FAILED REFUNDED }
enum OrderStatus { RECEIVED IN_PRODUCTION READY SHIPPED DELIVERED CANCELLED }
enum DiscountType { PERCENTAGE FIXED_AMOUNT }
enum Language { he en }
```

## Models

### Product
`id`, `slug` (unique), `name_he`, `name_en`, `description_he`, `description_en`,
`category` (Category), `basePrice` (Decimal), `customizable` (Boolean),
`isActive`, `isFeatured`, `sortOrder` (Int), `createdAt`, `updatedAt`.
Relations: `images ProductImage[]`, `variants ProductVariant[]`,
`customPricingRule CustomPricingRule?`, `colorOptions ColorOption[]` (m-n),
`reviews Review[]`, `bundles Bundle[]` (m-n).

### ProductVariant
`id`, `productId`, `name_he`, `name_en` (e.g. "S"/"M"/"L"),
`width?`, `height?`, `depth?`, `diameter?` (Decimal, cm), `price` (Decimal),
`sku`, `isActive`. Relation back to `Product`. Used as **base tiers** for custom pricing.

### CustomPricingRule
One-to-one with Product (nullable side on Product). `id`, `productId` (unique),
`basedOnVariant` (which variant tier is the default base reference),
`pricePerCmWidth?`, `pricePerCmHeight?`, `pricePerCmDepth?`, `pricePerCmDiameter?` (Decimal),
constraints: `minWidth? maxWidth? minHeight? maxHeight? minDepth? maxDepth?` (Decimal).
See `03-pricing-engine.md` for how these feed the algorithm.

### ColorOption
`id`, `name_he`, `name_en`, `hexCode`, `imageUrl?` (swatch), `isActive`.
Many-to-many with `Product`. (Color surcharge is a future hook — currently 0.)

### ProductImage
`id`, `productId`, `url`, `altText_he`, `altText_en`, `sortOrder` (Int), `isPrimary` (Boolean).

### Order
`id`, `orderNumber` (unique, generated), `customerName`, `customerEmail`, `customerPhone`,
`shippingAddress` (Json), `shippingMethod` (ShippingMethod),
`subtotal`, `shippingCost`, `discount`, `total` (Decimal),
`couponCode?`, `paymentStatus` (PaymentStatus), `orderStatus` (OrderStatus),
`installments? Int`, `notes?`, `language` (Language), `createdAt`, `updatedAt`.
Relation: `items OrderItem[]`.

### OrderItem
`id`, `orderId`, `productId`, `variantId?`, `isCustom` (Boolean),
`customWidth?`, `customHeight?`, `customDepth?`, `customDiameter?` (Decimal),
`selectedColorId?` (→ ColorOption), `quantity` (Int), `unitPrice`, `totalPrice` (Decimal).
Snapshot prices at order time (don't recompute from live product later).

### Coupon
`id`, `code` (unique), `discountType` (DiscountType), `discountValue` (Decimal),
`minOrderAmount?`, `maxUses? Int`, `usedCount Int @default(0)`,
`validFrom?`, `validUntil?`, `isActive`.

### Bundle  *(phase 2 UI, model now)*
`id`, `name_he`, `name_en`, `description_he`, `description_en`,
`products Product[]` (m-n), `bundlePrice` (Decimal), `isActive`.

### NewsletterSubscriber
`id`, `email` (unique), `name?`, `language` (Language), `subscribedAt`, `isActive`.

### Review  *(phase 2 UI, model now)*
`id`, `productId`, `customerName`, `rating Int` (1–5), `comment_he?`, `comment_en?`,
`isApproved Boolean @default(false)`, `createdAt`.

## Relations summary

- Product 1—n ProductVariant, ProductImage, Review
- Product 1—1 CustomPricingRule
- Product n—m ColorOption, Bundle
- Order 1—n OrderItem; OrderItem n—1 Product / ProductVariant? / ColorOption?

## Seed data (see `prisma/seed.ts`)

3–4 sample products across categories (e.g. TABLE, SHELF, NIGHTSTAND, CONSOLE), each with
S/M/L variants, a `CustomPricingRule`, 2–3 color options, and multiple images. Plus a couple
of coupons and a few newsletter subscribers. This is essential for FE development.
