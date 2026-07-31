# CHANGES — staged client feedback (2026-07-28)

Staging doc for a second round of client feedback, captured 2026-07-28. **Not implemented yet** —
this is the plan to work from next session. Each item below has been checked against the current
codebase (file:line references) so it's ready to execute without re-research. When we start
building an item, move it into `.claude/ROADMAP.md` as a real milestone and log it in
`.claude/PROGRESS.md` as usual — this file is just the intake/triage buffer.

Legend: `[ ]` not started. Nothing in this file is checked off yet.

---

## 1. Product page — replace spec block with variant comparison table

The technical-spec block we just shipped (M1.28g) is being reverted. Client wants a table
comparing the product's size variants side by side (dimensions only, **no prices**), plus a
closing row inviting contact for custom dimensions/color/anything else.

- [ ] **Remove the spec block entirely** (client changed their mind after M1.28g shipped):
  - `src/features/products/ProductDetail.tsx:711-734` — the rendered section
  - `src/features/admin/products/ProductFormPage.tsx` — `'specs'` tab: `Tab` type entry (30),
    `SpecRow` interface (55-61), `specs` in `FormState` (92), `emptySpecRow()` (95-101),
    `addSpec/setSpecField/removeSpec/moveSpec` handlers (418-443), validation (498-502), submit
    mapping (~563-570), `TABS` entry (613), tab render block (1345-1470)
  - `prisma/schema.prisma:69-71` — `Product.specs Json @default("[]")` (needs a migration to drop)
  - `src/shared/schemas/index.ts:136-149` — `productSpecRowSchema`/`productSpecsSchema`
  - `src/shared/types.ts:66-73,92` — `ProductSpecRow`, `ProductDTO.specs`
  - `src/server/services/productService.ts:108`, `adminProductService.ts:113` — DTO mapping
  - `src/i18n/he.json:107` / `en.json:107` — `product.specsTitle`
  - **Decision:** drop the column/schema cleanly rather than leaving unused dead code (matches
    project convention — no half-finished/unused fields). Only one product (TALO, test data from
    verifying M1.28g) has a row in it; safe to drop.
- [ ] **Build variant comparison table** from existing `ProductVariant` data — no new schema
      needed. Fields available per variant: `name_he/en`, `width/height/depth` (optional Decimal),
      `diameter` (optional Decimal), `sku` (`prisma/schema.prisma:85-100`). Table: columns = variants
      (S/M/L), rows = dimensions (W/H/D or diameter, whichever the product uses) — **never render
      `price`**. Variant selector already exists at `ProductDetail.tsx:352-382` for reference on
      reading variant data.
  - **Open question:** what should render for products with only 1 variant (or fully
    custom-dimension-only products)? A 1-column "table" isn't useful — probably hide the
    comparison table and just show the single size's dimensions inline, or skip the section.
    Decide during implementation.
- [ ] **Add closing contact row**: "Want custom dimensions / color / anything else? Contact us"
      — bilingual, likely linking to the same WhatsApp flow as the "Request a price offer" CTA.

## 2. Product page — image gallery bugs

`src/features/products/ImageGallery.tsx`:

- [ ] **Main image gets cropped**: container is `aspect-[4/3]` + `overflow-hidden` (line 68), image
      uses `fill` + `object-cover` (lines 79-87) — any photo whose native ratio isn't 4:3 gets cropped.
      Fix direction: switch to `object-contain` on a neutral/surface background (letterboxing) instead
      of `object-cover`, or make the box adapt to the image's aspect ratio. Needs a visual call on
      which trade-off looks best with real product photos — decide during implementation.
- [ ] **Arrows don't flip for RTL**: prev button always renders `ChevronLeft` (line 103), next
      always renders `ChevronRight` (line 111), regardless of `locale` — so in Hebrew the arrows point
      the wrong way. Positioning (`start-2`/`end-2`, logical) is already correct — only the icon choice
      is wrong. **Fix is a direct copy of the pattern already used correctly elsewhere**:
      `src/features/reviews/ReviewsCarousel.tsx:94-98,123-127` swaps `ChevronRight`/`ChevronLeft` based
      on RTL — mirror that here.

## 3. Product page — Reviews + FAQ side by side on desktop

Current stacked order in `ProductDetail.tsx`: FAQ (737-741) → Related products (744-753) → Reviews
(756, full-width). Client wants Reviews and FAQ in the **same row on laptop/desktop**, both
**below Related products** on mobile they stay stacked.

- [ ] Reorder to: Description → Brand values → Variant table (§1) → Related products → 2-col grid
      (`lg:grid-cols-2` or similar) containing Reviews + FAQ, single column on mobile.
- **Open question:** which side goes first (Reviews left / FAQ right, or vice versa) — matters for
  RTL (visually flips). Decide during implementation, probably FAQ first since it's more
  informational/pre-purchase, Reviews second as social proof.

## 4. Product page — 2 more brand values

`ProductDetail.tsx` `TRUST_KEYS` (line 38) currently has 5 items, rendered 693-707, i18n keys
`product.trust.*` in `he.json:100-106`/`en.json:100-106`.

- [ ] Add: **delivery not included** (לא כולל משלוח) and **VAT included** (כולל מע״מ / VAT
      included) as 2 new keys + array entries. Confirm with client these are worded as disclaimers,
      not literal "trust" claims — visually they can still live in the same block since that's where
      the client asked for them.

## 5. Home — hero heading must stay on 1 line

`src/features/home/HeroSection.tsx:97-104` — heading is fixed breakpoint jumps
(`text-4xl md:text-5xl lg:text-6xl`) inside a `max-w-[230px] sm:max-w-xs md:max-w-xl` wrapper
(line 82), no fluid sizing — long admin-entered text wraps on mobile. Text comes from
`SiteContent` key `home.hero` (admin-editable, `SiteContentPage.tsx` Hero tab), falls back to
static i18n.

- [ ] Fix direction: fluid typography via `clamp()` scaled to viewport width as the first pass
      (covers realistic heading lengths without a layout jump). If very long admin-entered strings can
      still wrap, consider either a client-side auto-shrink (measure `scrollWidth` vs `clientWidth`,
      step font-size down) or an admin-facing character-count hint — decide if needed once clamp() is
      tried against real content.
- Note: `.claude/docs/admin-site-data-sync-plan.md:29-51` calls this admin field "dead" — that's
  **stale**, commit `288f60f` wired it up after that doc was written. Don't remove it.

## 6. Home — testimonials carousel

`src/features/home/TestimonialsSection.tsx` is currently a static 3-col grid (line 45), no drag,
no arrows. **`embla-carousel-react@^8.6.0` is already a dependency**, already used correctly at
`src/features/reviews/ReviewsCarousel.tsx` — direction-aware (`direction: isRtl ? 'rtl' : 'ltr'`,
lines 26-30), swapped chevrons for RTL (94-98, 123-127), dot indicators, drag via embla natively.

- [ ] Build `TestimonialsCarousel.tsx` mirroring `ReviewsCarousel.tsx`'s exact pattern — no new
      library needed, just reuse the established approach for consistency.

## 7. Legal pages — terms, privacy, accessibility statement

`.claude/ROADMAP.md` M1.21 has this unchecked/deferred. Confirmed: **no route exists at all**
(not even a stub) under `src/app/[lang]/(storefront)/` for terms, privacy, returns, or
accessibility. Footer (`src/components/layouts/Footer.tsx:37-48`) hides terms/privacy/returns
links entirely while `FEATURES.shop = false` (`src/lib/featureFlags.ts:8`). No accessibility
statement page exists anywhere — that's distinct from the accessibility **widget**
(`A11yWidget.tsx`), which does already exist and is unaffected by this.

- [ ] Build `/terms`, `/privacy`, `/accessibility` routes — bilingual, following the existing
      `about`/`faq` static-page pattern (`SiteContent` JSON blob, admin-editable, per M1.26 precedent)
      or bilingual placeholder copy per the original ROADMAP note if content isn't ready yet.
- [ ] **Unhide these footer links regardless of `FEATURES.shop`** — terms/privacy/accessibility
      are legal requirements independent of whether checkout is live (accessibility statement is
      legally required in Israel regardless of e-commerce status, per
      `.claude/docs/07-design-system.md:67-71`). `/returns` can likely stay gated behind
      `FEATURES.shop` since a returns policy only matters once purchasing is live — confirm with
      client.
- Client said "don't skip it" — this was previously deferred; do not defer again.

## 8. Floating button — WhatsApp → SocialsSpeedDial

`src/components/WhatsAppButton.tsx` — fixed circular button (`fixed bottom-6 end-6`, line 24),
rendered in `src/components/layouts/StorefrontLayout.tsx:52`. **All data needed already exists**,
no backend/schema changes required: the `business` settings object
(`src/server/services/adminSettingsService.ts`) already has `whatsappNumber`, `phone`, `email`,
`instagramUrl`, `facebookUrl` (lines 11-21), all admin-editable.

- [ ] Build `src/components/SocialsSpeedDial.tsx`: click main button → satellite links fan out
      above it (Facebook, Instagram, WhatsApp, phone `tel:`, email `mailto:`), `motion/react` stagger
      entrance (matches existing button's spring-in style), closes on outside click/Escape, same fixed
      `bottom-6 end-6` position. Replace the `<WhatsAppButton>` render site in `StorefrontLayout.tsx:52`.
- [ ] Delete `WhatsAppButton.tsx` once replaced (no other usages — confirm before deleting).

## 9. Admin — Gallery reordering + UI

`src/features/admin/gallery/GalleryPage.tsx` — reordering is up/down arrow buttons only
(`handleMove`, lines 141-177, swaps adjacent `sortOrder`), no drag-and-drop. Grid layout
(`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, line 360) of large always-expanded cards (6 text
inputs each, lines 645-753). "Add new image" form is a big always-visible section at the page
bottom (from line 379). No drag-and-drop library in `package.json` today (checked for
`@dnd-kit/*`, `react-beautiful-dnd` — neither present; `motion`'s `Reorder` API is available
transitively via the existing `motion` dependency but unused so far).

- [ ] **Drag-and-drop reordering** — evaluate `motion`'s `Reorder.Group`/`Reorder.Item` (already a
      dependency, matches project's "use motion/react throughout" convention) vs. adding `@dnd-kit/*`
      (better multi-column grid drag support). Decide during implementation based on how well `Reorder`
      handles a grid vs. a list.
- [ ] **Move "add image" into a modal** triggered by a button (top of page), instead of an
      always-visible bottom section.
- [ ] **Denser display** — smaller grid cards or a table layout, collapse the 6 text fields behind
      an expand/edit action instead of always showing all of them, to make the list easier to scan and
      reorder.
- Note: the Instagram admin page (`src/features/admin/instagram/InstagramPage.tsx`) mirrors this
  exact Gallery pattern (same up/down reorder, same always-visible add form). Not in scope for this
  round per the client's ask, but worth applying the same improvements there later for consistency
  — flagging, not scoping now.

## 10. Performance — `/shop` and `/product/[slug]` feel slow

Confirmed root causes:

- [ ] **No `loading.tsx` or `error.tsx` anywhere in the app** (zero matches across all of
      `src/app/**`). This is the direct cause of "nothing happens for ~5s" — no route-level Suspense
      boundary means the browser shows nothing during the server render/fetch. **Add `loading.tsx`
      (skeleton UI) and `error.tsx` for `/shop` and `/product/[slug]`** at minimum — biggest
      perceived-speed win for the least effort, no data-fetching changes required.
- [ ] **`/shop` is fully dynamic, not ISR** — despite ROADMAP M1.22 claiming storefront pages are
      "truly static/ISR", `/shop` (`src/app/[lang]/(storefront)/shop/page.tsx`) has no
      `export const revalidate` and reads `searchParams` (line 51), a Dynamic API that forces
      per-request SSR + a fresh DB hit every load regardless of any revalidate config. (Its internal
      data fetching is already parallelized via `Promise.all`, lines 60-67 — that part is fine.)
      Fix direction: wrap the underlying `getProducts`/`getActiveCategories` calls with Next's
      `unstable_cache` (or equivalent) so the _route_ still renders dynamically per filter, but the
      _DB queries_ are cached ~60-300s — cuts DB latency on repeat loads without losing per-request
      filtering.
- [ ] `/product/[slug]` already has `revalidate = 300` (line 17) — real ISR. It does have one
      unavoidable waterfall (`getProductBySlug` awaited alone before related-products/reviews/FAQ can
      start, since they depend on the result, lines 52-60) — this is a genuine 2-round-trip minimum,
      not a bug, and probably not worth restructuring.
- Navigation itself is not the bottleneck — all "shop" links already use next-intl's prefetching
  `Link` (`Header.tsx:79`, `FeaturedSection.tsx:34-39`), no async work blocks navigation.

## 11. Instagram integration

Client wants to stop manually uploading every Instagram post to the admin, and instead connect the
real Instagram account so the admin can pick which recent posts (image or video, video autoplaying
on loop) show in the 6-tile `InstagramSection`. **This is a bigger integration with external
dependencies (Meta Developer app, client's Instagram account type) — written up as a separate,
more detailed plan**: see [`.claude/docs/14-instagram-integration.md`](.claude/docs/14-instagram-integration.md).
Not scoped for immediate implementation — needs a decision + likely some client-side account setup
before work can start.
