# 17 — Pending Tasks (2026-09-29 batch)

> A small, prioritized backlog captured from a single planning pass. Unlike the numbered docs
> above (which describe how a subsystem is designed), this one is a **punch list** — check boxes
> off as items land, same convention as `.claude/ROADMAP.md`. Once a section is fully done, fold
> any lasting design notes into the relevant numbered doc and delete the checklist here.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done.

**Scope split:**

- Everything in Phases A–E lives behind `FEATURES.shop` (`src/lib/featureFlags.ts`) — currently
  `false`. Build and test these on `main` as usual; they simply aren't reachable by real
  customers until the flag flips.
- Phase F (**payment integration**) is the one item explicitly called out to build on its **own
  branch**, separate from everything else, so it can be tested in isolation before merging. Do it
  **last** — several Phase C items (installments count, refunds, accept/deny) are actually part
  of the same admin-orders epic already designed in `09-payments.md`; see the note in Phase C.
  **The provider itself isn't decided yet** — the client is researching alternatives to Morning;
  see the caveat at the top of Phase F before starting any of this work.

---

## Phase A — Bug fixes (do first, cheap, no dependencies)

- [ ] **Fix the custom-dimensions toggle switch on the product page.** In
      `src/features/products/ProductDetail.tsx` (~line 447) the thumb uses a physical
      `translate-x-5` / `translate-x-0.5` pair. That's an LTR assumption on an RTL-default site
      (golden rule #4) — in RTL the thumb slides the wrong direction and visually exits the track.
      Fix with a logical/RTL-aware transform (e.g. flip the offset based on `dir`, or use
      `rtl:-translate-x-5` alongside the existing class) so the thumb stays inside the track in both
      languages. Re-check the wishlist/other toggles nearby for the same pattern.
- [ ] **Hide the "Request a price offer" button behind `FEATURES.shop`.** It currently shows
      unconditionally (`src/features/products/ProductDetail.tsx`, `PriceOfferModal.tsx`). When
      `FEATURES.shop` is `false` this is the showcase-mode contact path (see
      `12-showcase-mode.md`) and should stay; when `true`, decide whether it's still wanted alongside
      a real cart/checkout, or should only show for non-customizable products. Confirm with the user
      which behavior is intended before wiring the condition.

## Phase B — Cart & pricing correctness

- [ ] **Recalculate the coupon discount when an item is removed from the cart.**
      `src/stores/cartStore.ts`: `removeItem` filters `items` but never re-runs the discount
      calculation — `discount` (agorot) stays whatever it was computed against the old subtotal,
      so `total()` can under- or over-discount after a removal. `removeItem` (and any other item
      mutation) should re-derive `discount` from `couponCode` + the new subtotal (same pricing path
      used when the coupon is first applied), or clear the coupon entirely if `minOrderAmount` is no
      longer met.
- [~] **Delivery: capture floor + apartment number** and feed them into the delivery
  calculation/quote. `Order.shippingAddress` is a `Json` blob today (no migration needed — just
  extend the shape) and there's no floor/apartment field or UI for it yet. Add the fields to the
  checkout address form + Zod schema (`src/shared/schemas/`), store them in the JSON blob, and
  pass them through to whatever delivery-cost logic exists/lands (see `10-devops.md` /
  OpenRouteService setup in `.claude/TODO.md` — floor access is the kind of thing that affects a
  real furniture delivery quote, e.g. no-elevator walk-up surcharge).
  **Status:** capture is done — the checkout address is now split into city / street (both
  autocomplete pickers), house number (required), entrance, floor, apartment and postal code;
  `shippingAddress` in `src/shared/schemas/index.ts` carries `houseNumber`, `entrance`, `floor`,
  `apartment`, `postalCode`, `lat`, `lng`, and they are stored in the order JSON. **Still open:**
  using floor/apartment in the fee (walk-up surcharge) — the fee is still distance-only; fold
  that into the oversized-items surcharge task below.
- [ ] **Delivery: surcharge for oversized items.** No shipping-cost logic exists in
      `src/shared/pricing.ts` yet — this is greenfield. Define what "too large" means (dimension
      threshold per product/variant, or a `Product`/`ProductVariant` flag) and add a surcharge rule
      alongside the floor/apartment logic above, in the same shared pricing module so client preview
      and server validation never diverge (golden rule #2).
- [x] **Research a replacement for OpenRouteService (delivery distance).** Flagged by the user
      (2026-09-29) as possibly not the best fit — route calculation is slow. Current flow
      (`src/server/services/deliveryDistanceService.ts`, called live from
      `POST /api/delivery/estimate` during checkout) makes **two sequential external HTTP calls**
      per estimate — `geocode/search` then `v2/directions/driving-car` — with no caching, on the
      **free tier** (`.claude/docs/10-devops.md`: 2,000 req/day), which is the likely source of the
      slowness the user is seeing, not just the provider itself. Before swapping providers, worth
      separately checking whether caching geocoded studio→customer-area distances (or geocoding
      once and caching by normalized address) would fix it without a migration at all. If a
      provider swap is still warranted, candidates to evaluate: **Google Maps Distance Matrix**
      (accurate, paid, generous free tier), **Mapbox Directions**, **HERE Routing**, or a
      self-hosted **OSRM** instance (fastest/no rate limit, but is infra to run and maintain — cuts
      against this project's "no Docker, Vercel-only" stance in `CLAUDE.md`). Whatever is chosen,
      keep it behind the same `calculateDeliveryFee`/`geocodeIsraeliAddress`/`getRoadDistanceKm`
      function shape so callers (`orderService.ts`, the estimate route) don't need to change.
      **If the decision ends up being to stay with OpenRouteService**, the `OPENROUTESERVICE_API_KEY`
      currently in use is under Omri's own account (per `.claude/TODO.md`) — switch it to an API
      key from Eden's (the client's) own OpenRouteService account before shipping, so usage/billing
      is tied to the business, not the developer.
      **Done (2026-09-29):** no full provider swap was needed. The estimate no longer makes two
      sequential calls — the customer picks a suggestion (coordinates come with it) and
      `DELIVERY_DISTANCE_CONFIG` in `deliveryDistanceService.ts` picks the distance mode:
      `"straight-line"` (default; haversine × 1.3, no API call) or `"routing"` (one ORS directions
      call, cached by rounded coordinates, falls back to straight-line on failure/quota).
      Address search/autocomplete and "use my location" now use **Photon** (photon.komoot.io,
      OSM, no key) because ORS geocoding handled Hebrew addresses poorly. The delivery fee is
      rounded up to the next ₪10. The API key is read from `ORS_API_KEY` (falls back to the old
      `OPENROUTESERVICE_API_KEY`). **Still open** — see the follow-up items right below.
- [ ] **Delivery: move the ORS key to the client's account, and decide on Photon hosting.** ORS is
      still used for the studio-address geocode (admin settings) and for `"routing"` mode, so the
      key under Omri's account should move to Eden's before launch (see above). Photon's public
      server is fair-use with no uptime guarantee — fine at showcase traffic; if checkout volume
      grows, self-host Photon or use a paid hosted geocoder.
- [ ] **Before launch: change `Permissions-Policy` to `geolocation=(self)`.** `next.config.ts`
      sets `Permissions-Policy: camera=(), microphone=(), geolocation=()` site-wide, which blocks the
      browser geolocation API for every page. The checkout's **"Use my location"** button
      (`src/features/checkout/CheckoutClient.tsx` → `handleUseMyLocation`) calls
      `navigator.geolocation.getCurrentPosition`, so with `geolocation=()` the browser refuses it
      ("Permissions policy violation") and the button shows the generic location error. It is left
      at `geolocation=()` on purpose while `FEATURES.shop` is `false` (checkout is unreachable, so
      nothing needs it) — flip it to `geolocation=(self)` when the shop relaunches. Keep `camera`
      and `microphone` as `()`.

## Phase C — Checkout & admin order controls

- [ ] **Installments: admin-configurable range (1–6).** Right now `Order.installments` is a
      free `Int?` with no stored admin setting. Add a settings field (e.g. in `SiteContent` or a new
      small settings row) for max allowed installments, and have the checkout installments selector
      read from it instead of a hardcoded list.
  > Depends on: this is genuinely usable today for display/validation, but only fully "does
  > something" once Phase F's Morning integration actually passes `installments` through — see
  > `09-payments.md` (`maxPayments`, terminal-imposed caps). Build the admin setting now; wire it
  > into the real payment payload when Phase F lands.
- [ ] **Payment form: make all fields required.** Audit the checkout form
      (name/email/phone/address/etc., `src/shared/schemas/`) and tighten Zod validation + the client
      form so nothing currently optional slips through as blank.
- [ ] **Order confirmation: show more detail** — delivery address (incl. floor/apartment once
      Phase B lands), itemized products with variant/custom-dimension info, quantities, and totals.
      This is the same page `09-payments.md`'s "order confirmation" email spec describes
      (`OrderEmailSnapshot`) — reuse that shape for the on-screen confirmation too, not a second
      ad-hoc structure.
- [ ] **Admin toggle: warn customers before checkout when order volume is too high.** A simple
      boolean (+ maybe a threshold) in admin settings; when on, checkout shows a warning message
      before the customer submits (e.g. longer lead time expected). Independent of payments — can
      ship anytime.
- [ ] **Admin: accept/deny incoming orders, with an admin-authored auto-email on deny.** This is
      part of the **same admin-orders epic already designed** in `09-payments.md` ("Order Management
      — Admin", `/admin/orders`) — that doc doesn't yet describe an accept/deny gate specifically, so
      extend it there when you get to Phase F rather than building a second, parallel order-admin UI
      now. Note this dependency to the user explicitly if asked to prioritize it earlier.
- [ ] **Admin: partial or full refund.** Already fully designed in `09-payments.md` under "Admin
      refunds — credit notes" — this **requires** the Morning integration (a refund is a credit note
      against an issued Morning document; there's nothing to refund against without it). Build this
      as part of Phase F, not before.

## Phase D — Product page UX polish

- [ ] **Custom-size input: replace with a scroll-wheel picker** (iOS `<select>`-wheel style)
      constrained to each dimension's `CustomPricingRule.min*/max*`, instead of free-text/number
      inputs. Needs a design pass — invoke `ui-ux-pro-max` first per the project's mandatory UI rule,
      and confirm step size (whole cm? 0.5 cm?) with the user.
- [ ] **Custom-size min/max hints: present more visually.** `ProductDetail.tsx` (~line 465–558)
      shows each dimension's `min`/`max` as two separate stacked one-line hints below the number
      input (`t('minHint')` / `t('maxHint')`, `he.json` lines 90–91) — easy to miss, not visually
      tied together. The admin side of this exact same data (`ProductFormPage.tsx` →
      `DimensionRangeField`, added under "מגבלות מידות" in the pricing-rule tab) now renders min/max
      as one combined range control (`min – max ס״מ` in a single bordered box); mirror that visual
      language here (or a single-line range string like "בין 50–120 ס״מ") so the constraint reads
      as one unit instead of two. This is a smaller, standalone step — do it whether or not/before
      the scroll-wheel picker above lands, since the wheel picker will need the same min/max data
      surfaced clearly regardless.
- [ ] **Colors: show the name and swatch value as visible text**, not just via the `title`/
      `aria-label` attributes. `ProductDetail.tsx` (~line 568–580) already has `colorName`
      (`color.name_he`/`name_en`) and `hexCode` in data — just not rendered as visible text next to
      the swatch. Straightforward.
- [ ] **`productDescription` and "Brand values" — move higher on the page and increase visual
      weight** (bolder/larger). Both already render in `ProductDetail.tsx` (~line 227 and ~744);
      this is a layout/typography pass, not new data. Check `07-design-system.md` for the type scale
      before picking sizes.
- [ ] **Standard variant selector → interactive table.** Today it's a flat row of pill buttons
      (`ProductDetail.tsx` ~line 391–421) with no visible dimensions — the user has to guess what
      "S/M/L" mean in cm. Replace with a table (variant name × width/height/depth/diameter columns)
      plus one more row for "custom" that links into the custom-dimensions toggle. Needs a UI/UX
      pass (`ui-ux-pro-max`) for how this collapses on mobile (golden rule #6 — mobile-first).

## Phase E — Needs a decision (not yet a committed task)

- [ ] **Quantity selector — keep or remove?** Flagged as "maybe remove" rather than a firm
      ask. For made-to-order custom furniture, qty > 1 is unusual (each customer normally orders one
      item per product config); removing it would simplify `ProductDetail.tsx` and the cart model.
      Ask the user to confirm before touching `quantity` state/schema/cart shape — this affects
      `OrderItem.quantity` semantics across pricing, cart, and order confirmation.

---

## Phase F — Payment integration (separate branch, build last)

> **Provider not yet decided.** `09-payments.md` is written up in full around **Morning**
> (carried over from the sibling project `lights-and-vessels`), but the client has **not
> committed to Morning** — he is currently researching which payment service best fits his
> business. **Do not start this phase until the client confirms a provider.** Most of
> `09-payments.md`'s design (the `PaymentProvider` interface shape, refund-as-credit-note
> concept, `/admin/orders` UI, webhook idempotency rules) is provider-agnostic groundwork and
> should transfer to whichever provider is chosen; only the client/webhook implementation
> specifics (env vars, payload shape, sandbox details) are Morning-specific and would need
> redoing for a different processor.

Once a provider is confirmed, follow the design in **`09-payments.md`** — hosted checkout,
webhook, `/admin/orders`, refunds, resend-document — adjusting the provider-specific parts as
needed. Do not re-derive the design from scratch. When starting this phase:

1. Create a dedicated branch (e.g. `feature/payments-<provider>`) off `main` so it can be tested
   end-to-end (sandbox card, webhook round-trip via a tunnel or Vercel preview URL — see
   `09-payments.md` → "Rollout plan") before merging.
2. Follow the doc's own phased rollout (Phase A plumbing/stub → Phase B sandbox → Phase C go
   live) inside that branch.
3. Fold in from this file: the installments-count admin setting (Phase C above) feeding
   `maxPayments`, the accept/deny order gate, and partial/full refunds — all belong in the same
   `/admin/orders` build-out, not as separate follow-on work.
4. Merge to `main` only once a full sandbox transaction (charge + webhook + confirmation email)
   has been verified, per the user's explicit go-ahead (this touches the live production DB and
   real money once credentials go live — see the payments doc's Security section).
