# 03 — Pricing Engine (Core Differentiator)

This is the most important domain logic in the app. Read it fully before touching pricing.

## Where it lives

- **Pure logic:** `shared/pricing.ts` — framework-free, no I/O, fully unit-tested.
- **Server use:** `server/src/services/pricingService.ts` loads product + variants + rule from
  the DB, then calls the shared functions to **validate** any client-submitted price before an
  order is saved.
- **Client use:** the product-detail store calls the same shared functions to show a **live
  price preview** as the user types dimensions.

> If the client and server ever compute different prices, the customer sees one number and is
> charged another. The shared module exists to make that impossible. Never duplicate this math.

## Inputs

```ts
// shared/pricing.ts (shape — refine during implementation)
interface VariantTier {
  id: string;
  width?: number; height?: number; depth?: number; diameter?: number; // cm
  price: number;            // agorot
}
interface PricingRule {
  basedOnVariantId?: string;
  pricePerCmWidth?: number; pricePerCmHeight?: number;
  pricePerCmDepth?: number; pricePerCmDiameter?: number;   // agorot per cm
  minWidth?: number; maxWidth?: number;
  minHeight?: number; maxHeight?: number;
  minDepth?: number; maxDepth?: number;
}
interface PriceOptions {
  variantId?: string;                 // standard selection
  custom?: { width?: number; height?: number; depth?: number; diameter?: number };
  colorId?: string;                   // reserved for future color surcharge
  quantity?: number;                  // default 1
}
```

All money is in **integer agorot** inside the engine. Convert to/from `Decimal` ₪ at the DB
and display boundaries only.

## Algorithm

```
calculatePrice(product, variants, rule, options):

  1. STANDARD VARIANT
     if options.variantId is set:
         unitPrice = variants[variantId].price
         goto step 4

  2. CUSTOM DIMENSIONS
     require product.customizable === true and a PricingRule, else error.
     a. VALIDATE each provided dimension against rule min/max constraints.
        Out of range → throw PricingError (with which dimension + bound).
     b. PICK BASE TIER: among variants, choose the base tier =
        the largest variant whose every defined dimension is <= the requested
        dimension ("closest-but-smaller"). If none qualifies (request smaller than
        the smallest variant), use the smallest variant as base.
        If rule.basedOnVariantId is set, prefer it as the explicit base reference.
     c. basePrice = baseTier.price
     d. For each dimension d in {width, height, depth, diameter}:
            delta = max(0, custom[d] - baseTier[d])     // only upcharge for growth
            surcharge_d = delta * rule.pricePerCm<D>     // 0 if rate not defined
        unitPrice = basePrice + sum(surcharge_d)

  3. (reserved) COLOR SURCHARGE
     colorSurcharge = 0  // hook kept; add when color pricing is introduced
     unitPrice += colorSurcharge

  4. unitPrice = round to whole agorot
     totalPrice = unitPrice * (options.quantity ?? 1)
     return { unitPrice, totalPrice, baseTierId, surchargeBreakdown }
```

### Notes & edge cases

- **Closest-but-smaller** means the base is the most expensive tier the customer's size still
  "contains," so they pay that tier plus only the growth beyond it. Going *below* a tier never
  reduces price below the base (delta is floored at 0).
- A dimension the variant doesn't define (`undefined`) contributes no surcharge for that axis.
- Missing per-cm rate ⇒ that axis is not upcharged (rate treated as 0).
- Round once, at the end, to integer agorot.
- Return a `surchargeBreakdown` so the UI can optionally show "base ₪X + width +₪Y".

## Server validation contract

When `POST /api/products/:id/calculate-price` or `POST /api/orders` runs:
1. Load product, its variants, and its pricing rule from the DB (never trust client copies).
2. Recompute each line with `shared/pricing.ts`.
3. For order creation, the server-computed `unitPrice`/`totalPrice` are authoritative and are
   what gets persisted on `OrderItem`. If the client-sent total disagrees beyond a 0-agorot
   tolerance, reject with `422`.

## Testing (mandatory — see `11-testing-quality.md`)

Unit tests in `shared/` covering: exact variant match; custom within one tier; custom between
tiers (base selection); custom below smallest tier; out-of-range constraint errors; missing
per-cm rate; multi-axis surcharge; rounding; quantity multiplication. The pricing engine must
have the highest test coverage in the codebase.
