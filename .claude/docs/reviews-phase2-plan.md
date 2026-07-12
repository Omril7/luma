# Reviews (Phase 2) — public submission, admin moderation, storefront carousel

> Implementation plan for the Reviews slice of Phase 2 (see `.claude/ROADMAP.md`). Scoped to
> Reviews only — Bundles and the other Phase 2 items are not covered here.

## Context

`.claude/ROADMAP.md` Phase 2 lists Reviews as: a public review form (rating + text per
product), an admin moderation queue (approve/reject) before publishing, and a storefront
carousel via `embla-carousel`.

Investigation found the data layer and half the admin API already exist from Phase 1:

- `Review` Prisma model (`prisma/schema.prisma:240`) — `productId, customerName, rating,
comment_he?, comment_en?, isApproved (default false), createdAt`.
- `GET /api/reviews/[productId]` — public, approved-only, paginated.
- `GET /api/admin/reviews` + `PATCH /api/admin/reviews/[id]` — admin list + approve/reject,
  already JWT-guarded via `withAdmin`.
- `updateReviewSchema` in `src/shared/schemas/index.ts`.
- Sidebar nav entry for `/admin/reviews` already wired in `src/features/admin/AdminShell.tsx`
  (`NAV_ITEMS`, icon `Star`) — **no nav change needed**.

What's missing, and what this plan builds:

1. A public `POST /api/reviews` endpoint + schema (nothing lets a visitor submit yet).
2. A real admin moderation UI at `/admin/reviews` (currently a static "coming soon" shell).
3. A storefront reviews section on the product page: submission form + `embla-carousel`
   carousel of approved reviews.
4. A small reusable `StarRating` component (none exists; `TestimonialsSection.tsx` hardcodes
   `★★★★★` as a literal string).

Everything mirrors existing, working patterns in this repo — no new architectural decisions.

## A. Backend — service, schema, DTO, routes

**`src/server/services/reviewService.ts`** (new — mirrors `productService.ts`'s
`import 'server-only'` + DTO-mapper style):

- `getApprovedReviewsForProduct(productId, { page, limit })` — same query currently inlined
  in `src/app/api/reviews/[productId]/route.ts`.
- `createReview(input: CreateReviewInput)` — checks the product exists (404 if not), then
  `prisma.review.create({ data: { ...input, isApproved: false } })`.

**`src/shared/schemas/index.ts`** — add next to `updateReviewSchema`:

```ts
export const createReviewSchema = z.object({
  productId: z.string().min(1),
  customerName: z.string().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  comment_he: z.string().max(2000).optional(),
  comment_en: z.string().max(2000).optional(),
})
export type CreateReviewInput = z.infer<typeof createReviewSchema>
```

**`src/shared/types.ts`** — add `ReviewDTO` (matches the shape already returned inline by the
admin GET/PATCH routes: `id, productId, productName_he/en, productSlug, customerName, rating,
comment_he?, comment_en?, isApproved, createdAt`).

**Routes:**

- `src/app/api/reviews/[productId]/route.ts` — refactor `GET` to call
  `reviewService.getApprovedReviewsForProduct` instead of inlining the Prisma query.
- `src/app/api/reviews/route.ts` (new) — `POST`, mirrors `src/app/api/contact/route.ts`:
  `withApi` + `checkRateLimit(req, { limit: 5, windowMs: 15 * 60 * 1000 })` +
  `parseBody(req, createReviewSchema)` + `reviewService.createReview`. 404 if product not
  found, else `NextResponse.json({ success: true }, { status: 201 })`.
- `src/app/api/admin/reviews/[id]/route.ts` — add `DELETE` (admin-only, mirrors the coupons
  admin delete) so the moderation queue can remove spam/rejected reviews outright, since the
  `Review` model only has a boolean `isApproved` (no distinct "rejected" state).

## B. Admin — moderation UI

**`src/features/admin/reviews/ReviewsListPage.tsx`** (new) — client component, structural
copy of `src/features/admin/coupons/CouponsListPage.tsx`'s pattern (`useAdminStore` for the
token, `useState`/`useCallback`/`useEffect` fetch loop, `api.get/patch/delete`, skeleton
loading rows, inline error banner, `alert()` on mutation failure, same pagination control):

- Filter: status select (`הכל` / `ממתין` / `מאושר`) mapped to `isApproved` query param.
- Table columns: product name (locale-aware), customer name, rating (`<StarRating readonly
value={rating} size="sm" />`), comment (truncated, he/en depending on admin locale),
  submitted date, status badge, row actions.
- Row actions: pending → **Approve** (`PATCH { isApproved: true }`, optimistic update like
  the coupon toggle) and **Delete**; approved → **Unpublish** (`PATCH { isApproved: false }`)
  and **Delete** (confirm dialog, same inline pattern as the coupons delete dialog).

**`src/app/(admin)/admin/reviews/page.tsx`** — replace the placeholder body with a thin
wrapper rendering `<ReviewsListPage />`, keeping the existing `Metadata` export (matches
`admin/coupons/page.tsx`'s thin-wrapper convention).

## C. Storefront — submission form + carousel

**Install** `embla-carousel-react` (confirmed absent from `package.json`; no carousel lib
exists anywhere else in the repo).

**`src/components/ui/StarRating.tsx`** (new, shared) — one component for both read-only
display (admin table, carousel cards) and interactive input (review form): props
`{ value: number; onChange?: (n: number) => void; size?: 'sm'|'md'|'lg'; readonly?: boolean
}`, built on `lucide-react`'s `Star` icon (filled vs outline), replacing the hardcoded
`★★★★★` string used in `TestimonialsSection.tsx` as the canonical pattern going forward
(leave `TestimonialsSection.tsx` itself untouched — out of scope).

**`src/features/reviews/ReviewsCarousel.tsx`** (new, client) — `embla-carousel-react`,
RTL-aware (`direction: locale === 'he' ? 'rtl' : 'ltr'`), prev/next buttons + dot indicators,
per `docs/05-frontend.md:63-69`. Each slide: `StarRating readonly`, comment text
(locale-appropriate field, fallback to the other language if empty), customer name, relative
date. No autoplay (kept simple; docs say autoplay is optional).

**`src/features/reviews/ReviewForm.tsx`** (new, client) — structural copy of
`ContactClient.tsx`'s form pattern (manual `useState` form + validation, no client-side Zod
import, `useUiStore().addToast` for success/error, `motion/react` fade-up entrance gated by
`a11y.noMotion`): fields = customer name, `StarRating` interactive input, comment textarea
(single field, saved into `comment_he` or `comment_en` based on `locale`). Submits via
`api.post('/api/reviews', {...})`. On success, shows an inline "thanks — pending review"
message (`t('reviews.formPendingNotice')`) instead of the review appearing immediately.

**`src/features/reviews/ReviewsSection.tsx`** (new) — composes heading + average-rating
summary + `ReviewsCarousel` (or an empty state if no approved reviews yet) + `ReviewForm`.

**Wiring:** `src/app/[lang]/(storefront)/product/[slug]/page.tsx` — alongside the existing
`getProductBySlug`/`getProducts` calls, fetch
`reviewService.getApprovedReviewsForProduct(product.id, { limit: 10 })` server-side and pass
the result into `ProductDetail` as a new `reviews` prop. `ProductDetail.tsx` renders
`<ReviewsSection reviews={reviews} productId={product.id} locale={locale} />` as a new
`<section className="mt-16 md:mt-24">` after the "Related products" block (same spacing/
heading pattern already used there).

**i18n** — add a top-level `"reviews"` key to both `src/i18n/he.json` and `en.json`,
following the `"contact"` section's naming convention (`formName`, `formRating`,
`formComment`, `formSubmit`, `formSubmitting`, `formSuccess`/`formPendingNotice`,
`formError`, `required`, plus `title`, `empty`, `average`, `carousel` prev/next/dot
aria-labels).

## Verification

- `npm run typecheck` and `npm run lint` after each of A/B/C.
- Manual, using `/run` or dev server: open a product page, confirm the Reviews section
  renders (empty state if no approved reviews for that product yet); submit a review via the
  form and confirm the toast + pending notice; log into `/admin/reviews`, confirm the new
  review shows as pending, approve it; reload the product page and confirm it now appears in
  the carousel (prev/next + dots work, RTL direction correct in `he`, LTR in `en`); test the
  admin Delete action removes a review; test the rate limiter by submitting >5 reviews quickly
  (expect a 429).
- `npm run test` for any existing pricing/store tests to confirm no regression (this feature
  doesn't touch pricing).
