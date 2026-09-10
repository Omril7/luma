# 16 — Reviews & Testimonials — unified `Review` table, homepage reviews, global reviews, review images

> **Status:** ✅ implemented and shipped (M1.28i, 2026-09-10). Migration
> (`prisma/migrations/20260910120000_review_global_and_image/`) applied to prod via the
> Supabase SQL Editor + `prisma migrate resolve`. Merged to `main` (`1191d55`).
> Dead `SiteContent` row `key = home.testimonials` deleted. Nothing outstanding.
> **Depends on:** nothing hard, but shares the upload path with
> [`storage.md`](storage.md) — see [§7](#7-relationship-to-storagemd).
> **LIVE-site rule:** the site is in production. The one required schema migration
> ([§2](#2-database-migration-consent-gated)) is **additive + one nullable relax**, is
> low-risk, and still **must not run without the owner's explicit go-ahead**. Everything
> else in this plan is app code that ships without touching the DB shape.

---

## Goal

Four connected changes to how customer feedback works:

1. **One table for everything.** Keep a single `Review` model as the source of truth for
   _all_ reviews — per-product reviews **and** general "about the business" reviews. No
   separate testimonial store.
2. **Homepage `TestimonialsSection` shows real reviews.** Replace the
   `getSiteContentByKey('home.testimonials')` curated-JSON source with **approved reviews
   the admin has flagged "feature on homepage"** (`featuredOnHome`). Product pages keep
   their own per-product review section unchanged in behaviour.
3. **Global reviews.** Let a visitor leave a review about the business itself (not tied to
   a product) from the home page.
4. **One optional image per review.** Customers may attach a single photo (optional); the
   admin can add / replace / remove the image on any review from the moderation panel.

### Decisions locked in (from the owner)

| Question                                | Decision                                                                                                                                                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How does the homepage choose reviews?   | **Explicit admin toggle** `featuredOnHome`. Home shows only flagged approved reviews, newest first. Section hides when none are flagged. No automatic "top-rated" magic.                                                               |
| Can customers upload a review image?    | **Yes** — optional field on the public form, backed by a **new rate-limited public upload endpoint**. Admin can also add/edit/remove the image.                                                                                        |
| Can the admin create a review directly? | **Yes** — a "New review" action in `/admin/reviews` (name, rating, he/en text, image, target = global or a product), created as `APPROVED`. This replaces the manual-entry ability lost when the curated testimonials list is removed. |

---

## 1. Current state (what exists today)

- **Model** `Review` (`prisma/schema.prisma:258`): `id, productId (String, required, FK),
customerName, rating Int, comment_he?, comment_en?, status ReviewStatus(NEW|READ|APPROVED|REJECTED), createdAt`.
- **Public API**
  - `GET /api/reviews/[productId]` → approved reviews for one product, paginated
    (`getApprovedReviewsForProduct`).
  - `POST /api/reviews` → `withApi` + rate-limit (5 / 15 min) + `createReviewSchema` →
    `reviewService.createReview` (status `NEW`, best-effort admin email).
- **Admin API**
  - `GET /api/admin/reviews` (filter by status, paginated, includes product name/slug).
  - `PATCH /api/admin/reviews/[id]` (`updateReviewSchema` — status + comment edits).
  - `DELETE /api/admin/reviews/[id]`.
  - `GET /api/admin/reviews/unread-count` (`status: 'NEW'`) — drives the sidebar badge.
- **Admin UI** `src/features/admin/reviews/ReviewsListPage.tsx` — real moderation queue
  (status filter, view/approve/reject/edit-comment/delete, pagination). Nav entry already
  wired (`adminNav.ts`, `/admin/reviews`, icon `Star`, category `inquiries`).
- **Storefront — product page**
  - `product/[slug]/page.tsx` fetches `getApprovedReviewsForProduct(product.id, { limit: 10 })`
    and passes `reviews` into `ProductDetail`.
  - `ProductDetail.tsx:859` renders `<ReviewsSection variant="embedded" />` in the FAQ +
    Reviews two-column grid.
  - `ReviewsSection.tsx` → heading + average + `ReviewsCarousel` + `ReviewForm`.
  - `ReviewForm.tsx` → name + interactive `StarRating` + comment textarea → `POST /api/reviews`.
  - `ReviewsCarousel.tsx` → embla, RTL-aware, `perView` prop (`single` in the embedded column).
- **Storefront — home page** (the part being replaced)
  - `(storefront)/page.tsx:87` → `getSiteContentByKey('home.testimonials')`; maps
    `row.value.items` → `TestimonialItem[]`; renders `<TestimonialsSection items={...} />`.
  - `TestimonialsSection.tsx` / `TestimonialsCarousel.tsx` consume
    `TestimonialItem { quote_he/en, author_he/en, location_he/en, rating }` — a
    windowed, drag-free, infinite-loop embla carousel with per-card tween transforms.
  - Admin edits this JSON via **Site Content → "דף הבית — המלצות לקוחות"**
    (`SiteContentPage.tsx` `TestimonialsTab`, `home.testimonials` key).
- **Shared** `PublicReviewDTO` (`types.ts:207`), `ReviewDTO` (`types.ts:156`),
  `createReviewSchema` / `updateReviewSchema` (`schemas/index.ts:350`).
- **Image infra** `src/components/ui/ImageUpload.tsx` (admin, JWT) →
  `POST /api/admin/upload` (`withAdmin`, 5 MB, jpg/png/webp/gif) → `storage.save()`.
  Orphan cleanup: `cloudinaryCleanupService.deleteIfOrphaned` + `getAllDbImageUrls()`
  (scans `ProductImage.url`, `ColorOption.imageUrl`, all `SiteContent` blobs).

---

## 2. Database migration (consent-gated)

**One migration. Additive except a single `NOT NULL` relax. Nothing destructive.**

### `prisma/schema.prisma` — `Review` model

```prisma
model Review {
  id             String       @id @default(cuid())
  productId      String?      // ← was required. null = global / "about the business" review
  customerName   String
  rating         Int
  comment_he     String?
  comment_en     String?
  imageUrl       String?      // ← NEW — optional single image (Cloudinary URL)
  status         ReviewStatus @default(NEW)
  featuredOnHome Boolean      @default(false)  // ← NEW — admin flag; drives the homepage section
  createdAt      DateTime     @default(now())

  product Product? @relation(fields: [productId], references: [id])  // ← relation now optional
}
```

`Product.reviews Review[]` stays as-is (an optional back-relation is fine).

### Migration SQL (`prisma migrate dev --name review_global_and_image`)

```sql
ALTER TABLE "Review" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Review" ADD COLUMN "featuredOnHome" BOOLEAN NOT NULL DEFAULT false;
```

### Why this is safe on the live DB

- **luma-manager does not touch `Review`** (it reads/writes `Order`/`OrderItem`/`Product`
  only — see `schema.prisma:3`). Zero cross-app risk.
- All three statements are non-blocking on Postgres for a table this small, and none
  rewrites existing rows. `ADD COLUMN ... DEFAULT false` is a metadata-only change on
  modern Postgres (Supabase is 15+).
- Existing rows: `imageUrl` = `NULL`, `featuredOnHome` = `false`, `productId` unchanged —
  every current review stays a product review, unflagged. **No behaviour change until the
  app code below ships.**
- The FK constraint on `productId` is unaffected by dropping `NOT NULL`.

### Rollout

1. Get explicit owner approval for the migration.
2. `npm run db:migrate` against the Supabase **dev** project first; verify with `db:studio`.
3. Apply to production behind the maintenance page — follow the **migration-day runbook** in
   [`storage.md` Part 3](storage.md#part-3--maintenance-mode-for-migrations-that-need-a-downtime-window)
   (`prisma migrate deploy`, app code in the same deploy). This migration is fast and
   non-locking, so the window is short, but the page removes any risk of a visitor hitting a
   half-migrated state.
4. **App code is backwards-compatible with the pre-migration DB** except the two new
   columns — so if the migration is delayed, hold the whole feature branch; don't half-ship.

---

## 3. Backend

### 3a. Shared — `src/shared/schemas/index.ts`

```ts
// createReviewSchema — productId now optional/nullable; add imageUrl
export const createReviewSchema = z.object({
  productId: z.string().min(1).nullish(), // omitted / null => global review
  customerName: z.string().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  comment_he: z.string().max(2000).optional(),
  comment_en: z.string().max(2000).optional(),
  imageUrl: z.string().url().max(500).optional(), // set from the upload endpoint response
})

// updateReviewSchema — add image + homepage flag
export const updateReviewSchema = z.object({
  status: z.enum(['NEW', 'READ', 'APPROVED', 'REJECTED']).optional(),
  comment_he: z.string().max(2000).nullable().optional(),
  comment_en: z.string().max(2000).nullable().optional(),
  rating: z.number().int().min(1).max(5).optional(), // allow fixing rating from admin
  imageUrl: z.string().url().max(500).nullable().optional(), // null => remove image
  featuredOnHome: z.boolean().optional(),
})

// NEW — admin-authored review
export const adminCreateReviewSchema = z.object({
  productId: z.string().min(1).nullish(),
  customerName: z.string().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  comment_he: z.string().max(2000).optional(),
  comment_en: z.string().max(2000).optional(),
  imageUrl: z.string().url().max(500).optional(),
  featuredOnHome: z.boolean().optional().default(false),
  status: z.enum(['NEW', 'READ', 'APPROVED', 'REJECTED']).optional().default('APPROVED'),
})
export type AdminCreateReviewInput = z.infer<typeof adminCreateReviewSchema>
```

Guard rule (enforce in the service, not just the schema): a review needs **at least one of**
`comment_he` / `comment_en` **or** `imageUrl` — reject an empty review.

### 3b. Shared — `src/shared/types.ts`

```ts
export interface PublicReviewDTO {
  id: string
  customerName: string
  rating: number
  comment_he?: string
  comment_en?: string
  imageUrl?: string // ← NEW
  createdAt: string
}

// NEW — what the homepage carousel consumes
export interface HomeReviewDTO {
  id: string
  customerName: string
  rating: number
  comment_he?: string
  comment_en?: string
  imageUrl?: string
  productName_he?: string // present when the review is tied to a product
  productName_en?: string
  createdAt: string
}

export interface ReviewDTO {
  id: string
  productId: string | null // ← was string
  productName_he: string | null // ← was string
  productName_en: string | null // ← was string
  productSlug: string | null // ← was string
  customerName: string
  rating: number
  comment_he?: string
  comment_en?: string
  imageUrl?: string // ← NEW
  status: 'NEW' | 'READ' | 'APPROVED' | 'REJECTED'
  featuredOnHome: boolean // ← NEW
  createdAt: string
}
```

### 3c. Service — `src/server/services/reviewService.ts`

- **`getApprovedReviewsForProduct`** — add `imageUrl: r.imageUrl ?? undefined` to the DTO map.
  No query change (still `where: { productId, status: 'APPROVED' }`).
- **`createReview(input: CreateReviewInput)`**
  - If `input.productId` is set → keep the existing "product exists? else return null (404)"
    check. If `null`/absent → it's a global review, skip the product lookup.
  - Persist `imageUrl` and (always) `productId: input.productId ?? null`.
  - `notifyAdminOfNewReview` — when there's no product, show `ביקורת כללית על העסק` in the
    "מוצר" row instead of the product name.
- **`getFeaturedHomeReviews(limit = 12): Promise<HomeReviewDTO[]>`** — NEW
  ```ts
  const rows = await prisma.review.findMany({
    where: { status: 'APPROVED', featuredOnHome: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { product: { select: { name_he: true, name_en: true } } },
  })
  return rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    comment_he: r.comment_he ?? undefined,
    comment_en: r.comment_en ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
    productName_he: r.product?.name_he,
    productName_en: r.product?.name_en,
    createdAt: r.createdAt.toISOString(),
  }))
  ```
- **`adminCreateReview(input: AdminCreateReviewInput)`** — NEW. Validate product (if
  `productId`), enforce the "text or image" guard, `prisma.review.create`. No admin email
  (the admin is the author). Return the full `ReviewDTO`.
- **`replaceReviewImage` / delete flow** — whenever `PATCH` changes `imageUrl` to a new URL
  or `null`, or a review is deleted, call
  `deleteIfOrphaned(previousImageUrl)` (best-effort, never throws).

### 3d. Routes

| Route                                 | Change                                                                                                                                                                                                                           |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/reviews`                   | `createReviewSchema` now allows no `productId`. Return 404 only when a **given** `productId` doesn't exist. Rate limit unchanged (5 / 15 min).                                                                                   |
| **`POST /api/reviews/upload`**        | **NEW.** `withApi` + `checkRateLimit(req, { limit: 8, windowMs: 60 * 60 * 1000 })`. Accepts `multipart/form-data` with one `file`. Validate: `image/jpeg                                                                         | png              | webp`, **≤ 5 MB**, and (defence in depth) sniff the magic bytes, not just `file.type`. `storage.save()`→`{ url }`. This is the only new public write surface — keep it tight; no auth, so the rate limit + size + type checks are load-bearing. |
| `GET /api/reviews/[productId]`        | No change (still product-scoped, approved-only).                                                                                                                                                                                 |
| `GET /api/admin/reviews`              | `include: { product: {...} }` → product may be `null`; map `productName_*`/`productSlug` to `null` when absent. Add `imageUrl`, `featuredOnHome` to the row DTO. Optional: accept `?scope=global                                 | product` filter. |
| `PATCH /api/admin/reviews/[id]`       | Handle `rating`, `imageUrl` (incl. `null` = remove → orphan-cleanup the old URL), `featuredOnHome`. Reject `featuredOnHome: true` unless the review is (or is being set) `APPROVED` — a hidden review can't be on the home page. |
| **`POST /api/admin/reviews`**         | **NEW.** `withAdmin` + `adminCreateReviewSchema` → `reviewService.adminCreateReview` → `201` + `{ review: ReviewDTO }`.                                                                                                          |
| `DELETE /api/admin/reviews/[id]`      | Also `deleteIfOrphaned(review.imageUrl)` after delete.                                                                                                                                                                           |
| `GET /api/admin/reviews/unread-count` | No change.                                                                                                                                                                                                                       |

### 3e. Orphan cleanup — `src/server/services/cloudinaryCleanupService.ts`

`getAllDbImageUrls()` — add:

```ts
const reviewImages = await prisma.review.findMany({
  where: { imageUrl: { not: null } },
  select: { imageUrl: true },
})
for (const r of reviewImages) if (r.imageUrl) urls.add(r.imageUrl)
```

---

## 4. Storefront — product page (per-product reviews)

Small, additive — the section itself already works after the September responsive fix.

- **`PublicReviewDTO`** now carries `imageUrl`. `product/[slug]/page.tsx` needs no change
  (it already spreads the service result).
- **`ReviewsCarousel.tsx`** — when `review.imageUrl` is set, render a thumbnail above the
  `blockquote` (rounded, `object-cover`, fixed aspect e.g. `aspect-[4/3]`, `next/image` with
  a sensible `sizes`). Click → simple lightbox (reuse the pattern from the product
  `ImageGallery` zoom, or a minimal `<dialog>`; keep it lightweight).
- **`ReviewForm.tsx`** — add an **optional image field**:
  - A compact picker (reuse the visual language of `ImageUpload` but public): choose file →
    client-side check (type + ≤ 5 MB) → `POST /api/reviews/upload` (no token) → hold the
    returned `url` in form state → show thumbnail + "remove".
  - Include `imageUrl` in the `POST /api/reviews` body.
  - Copy: "הוספת תמונה (לא חובה)" / "Add a photo (optional)".
  - Consider extracting the public uploader into `src/components/ui/PublicImageUpload.tsx`
    so the home-page global form reuses it verbatim.
- **i18n** — new `reviews.*` keys: `formImageLabel`, `formImageHint` ("JPG/PNG/WebP, עד 5MB"),
  `formImageRemove`, `formImageError`, `imageAlt` ("תמונה מאת {name}").

---

## 5. Storefront — home page (`TestimonialsSection` → reviews)

### 5a. Data source swap — `(storefront)/page.tsx`

- **Remove** `getSiteContentByKey('home.testimonials')` from the `Promise.all` and the
  `TestimonialItem[]` mapping.
- **Add** `getFeaturedHomeReviews(12)` → pass as `reviews` to `TestimonialsSection`.
- The section already renders inside `<div className="bg-secondary">`; keep that.

### 5b. Components

Keep the existing carousel mechanics (windowed infinite loop + tweens in
`TestimonialsCarousel.tsx` — that engine is deliberate, see `PROGRESS.md 2026-07-31`), just
change the item shape:

- **`TestimonialsSection.tsx`** — prop becomes `reviews: HomeReviewDTO[]`. Still
  `if (reviews.length === 0) return null`. Heading stays from `t('home.testimonials.heading')`
  ("לקוחות מספרים" / "Customers Say").
- **`TestimonialsCarousel.tsx`** — `Card` renders from `HomeReviewDTO`:
  - `StarRating value={r.rating} readonly`
  - `blockquote` = locale comment, fallback to the other language (same fallback rule as
    `ReviewsCarousel`).
  - `footer`: `customerName`; sub-line = `productName_*` prefixed ("על <product>" / "on
    <product>") when present, empty for a global review (no more `location`).
  - Optional `imageUrl` thumbnail (same treatment as the product carousel card).
  - Delete the `quote_he/en` / `author_he/en` / `location_he/en` fields and the
    `TestimonialItem` interface; export `HomeReviewDTO` usage instead.
- The `carousel*` i18n keys under `home.testimonials` stay (prev/next/dot aria labels).

### 5c. "Write a review about us" — global review entry

- On the home page, near `TestimonialsSection` (below the carousel, or in the section
  header), add a **CTA button**: "כתבו לנו ביקורת" / "Write us a review".
- Clicking opens a **modal** (mirror `src/features/products/PriceOfferModal.tsx`: focus
  trap, `Esc`, backdrop click, `motion/react`) containing the shared `ReviewForm` with
  `productId={null}`.
  - `ReviewForm` gains `productId?: string | null` and a `heading` override
    (`t('reviews.globalFormHeading')` = "כתבו ביקורת על העסק" / "Review our business").
  - On success: same inline "תודה על הביקורת!" pending notice; the review lands as `NEW`
    and is invisible until the admin approves **and** flags it for the home page.
- The CTA must render even when the carousel is empty (so the section can't be `null` in
  that case — either always render the section wrapper with just heading + CTA when
  `reviews.length === 0`, or hoist the CTA out of `TestimonialsSection`). **Recommended:**
  `TestimonialsSection` always renders (heading + CTA); only the `<TestimonialsCarousel>` is
  conditional on `reviews.length > 0`.
- i18n: `reviews.writeAboutUsCta`, `reviews.globalFormHeading`.

### 5d. Retire the old testimonials content

- **`SiteContentPage.tsx`** — remove the `home.testimonials` tab: the `TAB` entry
  (`SiteContentPage.tsx:233`), `TestimonialsData` type, `defaultTestimonials()`,
  `testimonials` state, `testimonialsSave` hook, the load branch (`:1146`), and the
  `activeTab === 'home.testimonials'` render block (`:1238`) + the `TestimonialsTab`
  component itself.
- **`adminSiteContentService` / `getSiteContentByKey`** — no code change needed; the key
  just stops being read.
- **Migrate the existing content first.** Production `home.testimonials` holds 3 real
  customer testimonials (maya / pardes hanna, eran / kfar yona, yael zohar / zikhron
  ya'akov). Before the switch goes live, the owner should re-enter them via the new admin
  **"New review"** flow as global reviews, `APPROVED` + `featuredOnHome`, so the homepage
  isn't empty on launch. ⚠️ The stored `quote_en` for the eran/kfar-yona entry is corrupted
  ("Exactly what weWe ordered a bookshelf…wanted.") — retype it cleanly.
- The stale `SiteContent` row with key `home.testimonials` is then deleted manually via
  `db:studio` / SQL — **not** part of the gated migration.
- Grep for `home.testimonials` and `TestimonialItem` after the change — expect zero hits
  outside this doc and `PROGRESS.md`.

---

## 6. Admin — `/admin/reviews` moderation panel

`src/features/admin/reviews/ReviewsListPage.tsx`:

- **Product column** — show the product name, or a chip "ביקורת כללית" (neutral/secondary
  styling) when `productId === null`. `viewReview` dialog likewise.
- **"Feature on homepage" toggle** — a star toggle button in the row actions (and in the
  view dialog). Enabled only when `status === 'APPROVED'`. Optimistic `PATCH
{ featuredOnHome: !current }`, same pattern as the coupon active toggle. Show the filled
  star when on. A11y label "הצגה בעמוד הבית".
- **Image** — in the edit dialog, add `<ImageUpload value={imageUrl} onChange={...}
token={token} label="תמונת הביקורת" />`; `onChange(null)` sends `PATCH { imageUrl: null }`.
  Thumbnail also shown in the view dialog and (small) in the table row.
- **"+ ביקורת חדשה"** button (top, next to filters) → create dialog:
  - Fields: customer name, `StarRating` (interactive), `comment_he`, `comment_en`,
    `ImageUpload`, **target**: radio / select `כללית (על העסק)` vs `מוצר…` (a product picker —
    reuse whatever product-select component the price-offers or products UI uses; if none,
    a simple `<Select>` populated from `GET /api/admin/products?pageSize=200`).
  - Optionally a "feature on homepage" checkbox.
  - Submits `POST /api/admin/reviews`; created as `APPROVED` by default. Refetch list.
- **Status filter** — add an optional second filter "היקף": הכל / כלליות / לפי מוצר
  (`?scope=`), if the `GET` route gains that param. Nice-to-have, not required.
- All new strings are hardcoded Hebrew **consistent with the rest of this admin file**
  (the admin UI is he-only by existing convention — see `ReviewsListPage.tsx`).

---

## 7. Relationship to `storage.md`

[`storage.md`](storage.md) reworks **all** uploads from the current
"multipart → Vercel fn → `storage.save()`" proxy to **signed direct-to-Cloudinary** browser
uploads, and deletes `storage/local.ts`.

- This plan adds **one more caller** of the old proxy pattern: `POST /api/reviews/upload`.
  Build it now against the current `storage.save()` interface.
- **`storage.md` ships after this** (owner's stated order). When it lands, fold
  `/api/reviews/upload` into the new model: it becomes a **public** ticket issuer
  (`storage.createUploadTicket()`), keeping its own rate-limit, and the client switches to
  the shared `uploadImage()` helper. Add a checklist line to `storage.md` §4 "Update call
  sites" for the public review uploader (it's the one non-admin upload path, so its ticket
  endpoint must stay rate-limited and the preset's size/format cap is the real guardrail —
  exactly the model `storage.md` already describes).
- No blocker either way; just don't let the two branches collide on
  `src/server/providers/storage/index.ts`.

---

## 8. i18n keys to add (`he.json` + `en.json`)

Under `reviews`:

| key                 | he                          | en                                    |
| ------------------- | --------------------------- | ------------------------------------- |
| `formImageLabel`    | הוספת תמונה (לא חובה)       | Add a photo (optional)                |
| `formImageHint`     | JPG, PNG או WebP · עד 5MB   | JPG, PNG or WebP · up to 5MB          |
| `formImageRemove`   | הסרת התמונה                 | Remove photo                          |
| `formImageError`    | העלאת התמונה נכשלה, נסו שוב | Photo upload failed, please try again |
| `imageAlt`          | תמונה מאת {name}            | Photo by {name}                       |
| `writeAboutUsCta`   | כתבו לנו ביקורת             | Write us a review                     |
| `globalFormHeading` | כתבו ביקורת על העסק         | Review our business                   |

`home.testimonials.heading` + `home.testimonials.carousel*` stay as-is.

---

## 9. Verification

- `npm run typecheck && npm run lint && npm run test && npm run build` clean.
- **Migration (dev DB):** `npm run db:migrate`; `db:studio` shows `imageUrl`,
  `featuredOnHome`, nullable `productId`; existing reviews unchanged.
- **Product review + image:** submit a review with a photo on a product page → toast +
  pending notice; appears in `/admin/reviews` with a thumbnail; approve → shows on the
  product carousel with the image and lightbox; `he` RTL + `en` LTR both correct.
- **Global review:** home "Write us a review" → modal → submit (with and without image) →
  lands as `NEW`, `productId = null`, shows "ביקורת כללית" chip in admin.
- **Homepage feature flag:** approve a global review, toggle "feature on homepage" → it
  appears in the home `TestimonialsSection`; un-toggle → gone; with none flagged the
  carousel is hidden but the heading + CTA remain.
- **Admin create:** "+ ביקורת חדשה" for a product and for "כללית" → both created `APPROVED`;
  product one shows on that product page, global one is eligible for the homepage toggle.
- **Image lifecycle:** replace a review image in admin → old Cloudinary asset removed by
  orphan cleanup; delete a review with an image → asset removed.
- **Upload endpoint hardening:** `POST /api/reviews/upload` with a 7 MB file → rejected
  client-side (no request) and server-side (413/400); a `.pdf` renamed `.jpg` → rejected by
  the magic-byte check; >8 uploads in an hour from one IP → `429`.
- **Old testimonials gone:** `grep -r "home.testimonials"` / `TestimonialItem` → only docs;
  Site Content page has no "המלצות לקוחות" tab; home page renders without it.

---

## 10. File-by-file summary

**Schema / migration (gated)**

- `prisma/schema.prisma` — `Review`: `productId` nullable, `+imageUrl`, `+featuredOnHome`, optional `product` relation
- `prisma/migrations/<ts>_review_global_and_image/migration.sql` — 3 ALTERs

**Shared**

- `src/shared/schemas/index.ts` — `createReviewSchema` (+`imageUrl`, nullable `productId`), `updateReviewSchema` (+`rating`,`imageUrl`,`featuredOnHome`), `adminCreateReviewSchema` (new)
- `src/shared/types.ts` — `PublicReviewDTO.imageUrl`, `ReviewDTO` (nullable product fields, `imageUrl`, `featuredOnHome`), `HomeReviewDTO` (new)

**Server**

- `src/server/services/reviewService.ts` — `imageUrl` in maps; `createReview` global-aware; `getFeaturedHomeReviews` (new); `adminCreateReview` (new); orphan-cleanup on image change/delete
- `src/server/services/cloudinaryCleanupService.ts` — scan `Review.imageUrl`
- `src/app/api/reviews/route.ts` — allow no `productId`
- `src/app/api/reviews/upload/route.ts` — **new** public rate-limited image upload
- `src/app/api/admin/reviews/route.ts` — null-safe product; `+imageUrl`/`+featuredOnHome`; **new** `POST`
- `src/app/api/admin/reviews/[id]/route.ts` — handle `rating`/`imageUrl`/`featuredOnHome`; orphan cleanup

**Storefront**

- `src/app/[lang]/(storefront)/page.tsx` — drop `home.testimonials`, add `getFeaturedHomeReviews`
- `src/app/[lang]/(storefront)/product/[slug]/page.tsx` — no change
- `src/features/home/TestimonialsSection.tsx` — `HomeReviewDTO[]`; always render heading + CTA
- `src/features/home/TestimonialsCarousel.tsx` — `Card` from `HomeReviewDTO`; drop `TestimonialItem`
- `src/features/home/GlobalReviewModal.tsx` — **new** (mirrors `PriceOfferModal`)
- `src/features/reviews/ReviewForm.tsx` — `productId?: string | null`, optional image field, `heading` override
- `src/features/reviews/ReviewsCarousel.tsx` — render `imageUrl` + lightbox
- `src/components/ui/PublicImageUpload.tsx` — **new** (shared by product + global forms)

**Admin**

- `src/features/admin/reviews/ReviewsListPage.tsx` — global chip, homepage-star toggle, image in edit/view, "New review" dialog, optional scope filter
- `src/features/admin/site-content/SiteContentPage.tsx` — remove the `home.testimonials` tab + `TestimonialsTab` + types/state/hooks

**i18n**

- `src/i18n/he.json`, `src/i18n/en.json` — new `reviews.*` keys (§8)

**Docs / tracking**

- `.claude/ROADMAP.md` — new milestone (this) + a milestone pointing at `storage.md` after it
- `.claude/PROGRESS.md` — entry when it lands
- `CLAUDE.md` docs index — add row 16
- `.claude/docs/02-data-models.md` — update the `Review` section (nullable product, image, homepage flag)
- `storage.md` §4 — add the public review-uploader call-site line
