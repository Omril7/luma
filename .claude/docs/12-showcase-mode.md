# 12 — Showcase Mode (Browse-Only Catalog)

## Why

`FEATURES.shop` (`src/lib/featureFlags.ts`) is currently `false`, which redirects `/shop`,
`/product/*`, `/cart`, `/checkout`, and `/order-confirmation` away entirely (see
`src/middleware.ts`). The goal is to let visitors browse the full catalog and product detail
pages — with a static **"From X ILS"** price — while the purchase flow (cart, checkout, add to
cart) stays off. This must **not** delete or duplicate the existing cart/checkout/pricing code:
the flag's own doc-comment says it puts that flow "on hold... flip back to `true` to relaunch
it," and `Header.tsx`/`Footer.tsx` already conditionally render nav items off the same flag —
this plan extends that established pattern rather than introducing a new mechanism.

Two options were considered and rejected:

- **New parallel pages** for a read-only catalog — rejected because `/shop` already has
  category filters, sort, and pagination (`ShopClient` + `getProducts`), and `/product/[slug]`
  already has the full detail layout. A second implementation would drift out of sync with the
  first.
- **Deleting payments/cart/checkout** — rejected because it fights the codebase's existing
  "on hold, not deleted" design and throws away working code (pricing engine wiring, coupons,
  orders) that would need to be rebuilt if e-commerce relaunches.

## Concept

No new feature flag. `FEATURES.shop` is redefined precisely as: **gates the purchase flow** —
cart, checkout, order-confirmation, and any add-to-cart / quantity / buy UI. Catalog browsing
(`/shop` listing, `/product/[slug]` detail) becomes **unconditionally available**, and derives a
local `purchasingEnabled = FEATURES.shop` wherever a buy box would render.

## Changes by file

### 1. `src/middleware.ts`

Remove `/shop` and `/product` from `disabledShopPaths`; keep `/cart`, `/checkout`,
`/order-confirmation` blocked when `FEATURES.shop` is `false`. Update the comment above the
array — it currently says "Storefront route prefixes... on hold while the shop is disabled,"
which should become "...on hold while purchasing is disabled."

### 2. `src/components/layouts/Header.tsx`

- The `/shop` nav-link entry (currently `...(FEATURES.shop ? [{ href: '/shop', key: 'shop' }] : [])`)
  should render unconditionally — it's a catalog link now, not a purchase entry point.
- The cart icon block (`{FEATURES.shop && (...)}`) stays exactly as-is — cart access is still
  gated.

### 3. `src/components/layouts/Footer.tsx`

- `shopLinks`: make the `/shop` entry unconditional, same reasoning as the header.
- `infoLinks` legal pages (`terms`, `privacy`, `returns`): **leave gated** on `FEATURES.shop` —
  a returns policy is meaningless without purchasing.

### 4. `src/shared/pricing.ts`

Add one pure helper next to `calculatePrice`, so "lowest displayable price" has a single source
of truth (Golden Rule 2 — pricing logic lives once):

```ts
export function getStartingPrice(product: {
  basePrice: number
  variants: { price: number }[]
}): number {
  return product.variants.length > 0
    ? Math.min(...product.variants.map((v) => v.price))
    : product.basePrice
}
```

Units match `ProductDTO` today (₪, not agorot) — same convention `ProductCard`'s local
`lowestPrice` already uses. Note the custom-pricing engine never prices a custom order _below_
the smallest variant (`dimensionSurcharge` floors delta at 0), so the cheapest variant price is
always the true floor even for `customizable` products — no extra engine call needed here.

### 5. `src/features/products/ProductCard.tsx`

Delete the local `lowestPrice()` function; import and use `getStartingPrice` from
`@/shared/pricing` instead. Purely a dedup — the rendered "From X" label is unchanged, and this
component needs no other changes (it already links to `/product/[slug]` with no buy action on
the card itself).

### 6. `src/features/products/ProductDetail.tsx`

- Add a `purchasingEnabled: boolean` prop.
- When `true`: render exactly what exists today (buy box, live price calculator, variant
  selector, custom-dimension inputs, color swatches, quantity stepper, Add to Cart, sticky
  mobile bar) — zero behavior change.
- When `false`, render a reduced showcase box instead:
  - Keep: category badge, name, description, image gallery, wishlist heart, share button,
    related products, reviews.
  - Replace the live price block with a static line using `getStartingPrice(product)` —
    `{t('startingFrom')} {formatPrice(...)}`. No `AnimatePresence`/live-calc needed.
  - Drop entirely: variant-size buttons, the custom-dimension toggle + width/height/depth
    inputs, color-swatch selection, quantity stepper, Add to Cart button, sticky mobile bar.
  - Skip the `calculatePrice` `useMemo`, the `IntersectionObserver` sticky-bar effect, and
    `handleAddToCart` when `purchasingEnabled` is false — no dead work.
- Structure the two variants as sibling blocks gated by one `{purchasingEnabled ? <BuyBox/> :
<ShowcaseBox/>}` rather than scattering `purchasingEnabled &&` through every control, so the
  diff stays readable. If the file gets unwieldy, split `BuyBox`/`ShowcaseBox` into their own
  files under `src/features/products/`.

### 7. `src/app/[lang]/(storefront)/product/[slug]/page.tsx`

Pass `purchasingEnabled={FEATURES.shop}` into `<ProductDetail>`.

### 8. `src/app/[lang]/(storefront)/shop/page.tsx` / `ShopClient.tsx`

No changes required. Filters (category pills), sort, and pagination are already generic and
`ProductCard` already shows "From X" pricing with no buy action. Optional nice-to-have: a
different subtitle copy when `!FEATURES.shop` (e.g. "browse our pieces — contact us to order")
— not required for this plan.

### 9. i18n keys (`src/i18n/he.json`, `en.json`)

The `product` namespace already has an unused `from` key (`"מ-"` / presumably `"From"`) at
`product.from`. Recommend adding a dedicated `product.startingFrom` key instead
(e.g. he: `"החל מ-"`, en: `"Starting from"`) — as the _only_ price statement on the page (no
live calculator for context), "starting from" reads clearer than a bare "from" prefix. No other
new keys needed; everything else reuses existing `shop.*` / `product.*` strings.

## Open decisions

- **Nav label:** keep "Shop" (`nav.shop`) or rename to "Products"/"Catalog"
  (`nav.products` + i18n update) now that there's no purchasing? Cosmetic, low cost either way —
  defaulting to keeping `nav.shop` unless you'd rather rename now.
- **Customizable products with zero variants:** `getStartingPrice` falls back to `basePrice` for
  these. Worth a quick data check in `/admin/products` that every customizable product has a
  sensible `basePrice` set, since it's now customer-visible as the headline price.
- **Variant/size/color info as read-only text** (e.g. "Available in S/M/L, 40–120cm"): cut from
  this plan per the "just info + minimum price" brief. Easy follow-up if more on-page detail is
  wanted later — render the same data non-interactively instead of as selectable controls.

## Rollout / testing checklist

- With `FEATURES.shop = false` (current state): `/shop` and `/product/[slug]` load; `/cart`,
  `/checkout`, `/order-confirmation` still redirect home.
- Header/Footer show a catalog link but no cart icon.
- Product detail shows gallery, name, description, "Starting from X ILS", related products,
  reviews — no add-to-cart, variant/size/dimension/color controls, quantity stepper, or sticky
  bar.
- Flip `FEATURES.shop = true` locally and confirm **zero** behavior change from today (full buy
  box, cart, checkout all work exactly as before) — this is the regression check proving nothing
  was deleted, only conditionally hidden.
- Verify new/changed strings render correctly in both `he` (RTL) and `en` (LTR).
- Run `/check` (typecheck + lint + test) before committing.

## Non-goals

- Deleting cart/checkout/coupon/order code or routes — stays intact and flag-gated for a future
  relaunch.
- Building a second, separate catalog page — `/shop` and `/product/[slug]` are reused as-is.
- Any change to the pricing engine's math — `getStartingPrice` only reads existing
  variant/base prices; it doesn't calculate anything new.
