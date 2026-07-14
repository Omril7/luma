# Admin ↔ Site Data Sync — fix plan

> Implementation plan for the mismatches found in a full audit of "does the admin panel let you
> enter/see everything the storefront actually uses, and does the storefront actually use
> everything the admin panel lets you enter." Scoped to the issues below only — this is a punch
> list, not a new architectural topic (see `.claude/docs/13-category-taxonomy.md` and
> `reviews-phase2-plan.md` for the two house styles this borrows from).

## Context

Three research passes (catalog data, homepage/site content, coupons/newsletter/email) compared
every admin form field against the Prisma schema and the actual storefront rendering code. Two
classes of bug came out of it:

- **Dead admin input** — a field is editable in the admin, persisted to the DB, but nothing on
  the storefront (or in the send/checkout pipeline) ever reads it. The admin believes a change
  took effect; it didn't.
- **Missing admin input** — the storefront depends on a field the admin can't set, edit, or
  clear, so fixing/adding data requires direct DB access.

Findings are grouped below, ordered by priority. **🔴 Live now** items are reachable through the
site today. **🟡 Dormant** items are currently unreachable because `FEATURES.shop=false` puts
`/cart`, `/checkout`, `/order-confirmation` behind the showcase-mode redirect
(`src/middleware.ts:10-28`, see `.claude/docs/12-showcase-mode.md`) — still worth fixing before
shop re-enables, just not urgent.

---

## 🔴 A. Hero section — `home.hero` SiteContent key is dead

**Root cause:** Admin → Content → Hero tab (`src/features/admin/site-content/SiteContentPage.tsx:217-315`)
saves `title_he/en`, `subtitle_he/en`, `cta_he/en`, `imageUrl` to `SiteContent` key `home.hero`.
No code anywhere calls `getSiteContentByKey('home.hero')`. `src/features/home/HeroSection.tsx`
sources all copy from static i18n (`home.hero.eyebrow/heading/subheading/contactCta/whatsappCta`
in `src/i18n/he.json`/`en.json`) and a hardcoded `/hero.jpeg` image
(`HeroSection.tsx:90`). `src/app/[lang]/(storefront)/page.tsx:37` passes `HeroSection` only
`locale`/`whatsappNumber` — no content prop at all.

**Decision: remove the dead tab.** Hero stays a static design element, sourced entirely from
`src/i18n/he.json`/`en.json` (unchanged from today's behavior) — same treatment as the
Testimonials/Instagram/Contact section headings, which are already intentionally static i18n.

**Fix:**

- Delete the Hero tab and its fields from `SiteContentPage.tsx`.
- Delete the corresponding Zod schema entry / form state for `home.hero`.
- No storefront changes needed — `HeroSection.tsx` already works exactly as it should; this is
  purely removing the misleading admin form, not touching rendering.
- If any `SiteContent` row with key `home.hero` exists in the DB from testing, it's simply
  orphaned data — fine to leave or delete via `prisma studio`, no code depends on it either way.

---

## 🔴 B. Story section — same bug, plus a phantom `imageUrl` field

**Root cause:** Admin `home.story` tab (`SiteContentPage.tsx:327-400`) edits title/body (he/en)

- `imageUrl`. `src/features/home/StorySection.tsx` pulls `heading`/`body1`/`body2`/`cta` from
  static i18n only, and never renders an image slot at all (shows a decorative SVG icon,
  `StorySection.tsx:29-47`) — so `imageUrl` has no UI destination even in principle.

**Decision: remove the dead tab**, same as Hero — Story stays static i18n copy + the existing
decorative SVG icon (unchanged). This also resolves the phantom `imageUrl` question: since the
tab is gone, there's no image field left to decide a layout slot for.

**Fix:**

- Delete the Story tab and its fields from `SiteContentPage.tsx`.
- Delete the corresponding Zod schema entry / form state for `home.story`.
- No storefront changes needed — `StorySection.tsx` is untouched.

---

## 🔴 C. Email sending ignores `EmailSettings` entirely

**Root cause:**

- Admin sets `fromAddress`, `fromName_he/en`, `replyTo` via
  `src/features/admin/email-services/EmailServicesPage.tsx` →
  `src/server/services/adminEmailSettingsService.ts:54-81`.
- `EmailMessage` (`src/server/providers/email/index.ts:3-8`) has no `from`/`replyTo` fields at
  all.
- `src/server/providers/email/nodemailer.ts:19-25` hardcodes `from: process.env.EMAIL_FROM`.
- Newsletter send (`src/server/services/adminNewsletterService.ts:122-157`) never calls
  `getEmailSettings()` before sending.
- The one place that _does_ call `getEmailSettings()` — `src/app/api/admin/email-settings/test/route.ts:11-22`
  — only interpolates `fromName_en` into the test email's **subject line** as decoration, not an
  actual `from`/`replyTo` header.

**Decision: wire it up** — `EmailSettings` becomes the real source of `from`/`replyTo` for every
outgoing email.

**Fix:**

- `src/server/providers/email/index.ts` — extend `EmailMessage` with optional `from?: { address:
string; name?: string }` and `replyTo?: string`.
- `src/server/providers/email/nodemailer.ts` — use `message.from ?? { address:
process.env.EMAIL_FROM }` for the Nodemailer `from` field (format as `"Name" <address>` when a
  name is present); set `replyTo: message.replyTo` when provided.
- `src/server/services/adminNewsletterService.ts` — call `getEmailSettings()`, build
  `from`/`replyTo` from it (locale-appropriate `fromName_he`/`fromName_en` — newsletter sends
  already have a `targetLanguage`/per-subscriber `language`, use that to pick which `fromName_*`
  to use), pass through on every `emailProvider.send(...)` call.
- `src/app/api/admin/email-settings/test/route.ts` — pass the same `from`/`replyTo` fields instead
  of only decorating the subject, so "send test email" actually proves the configured sender
  works.
- Check any other `emailProvider.send(...)` call sites (order confirmation stub, contact form
  autoresponder if any) for the same gap while touching this code — out of scope to fix here if
  found, but note them.

---

## 🔴 D. No public newsletter signup form exists

**Root cause:** `POST /api/newsletter/subscribe` (`src/app/api/newsletter/subscribe/route.ts`)
is fully built and validated (`newsletterSubscribeSchema`), and the admin Subscribers tab
(`src/features/admin/newsletter/NewsletterPage.tsx:135-405`) is a complete list/CSV-export UI —
but no component anywhere in `src/components`/`src/features` calls that endpoint. There is
currently no way for a real visitor to become a subscriber.

**Decision: wire it up, via two entry points.**

1. **Primary signup form** — `src/features/newsletter/NewsletterSignupForm.tsx` (new): email
   input (+ optional name), submits to `POST /api/newsletter/subscribe` with `language: locale`,
   success/error toast via `useUiStore().addToast` (matches `ContactClient.tsx` conventions per
   `reviews-phase2-plan.md`'s house style). Placement: footer — visible sitewide, low layout
   commitment, no new homepage section needed.
2. **Contact-page checkbox** — add a "הרשמה לניוזלטר" / "Sign up for our newsletter" checkbox to
   the existing contact form (`ContactClient.tsx`), unchecked by default. On successful contact
   submission, if checked, additionally call `POST /api/newsletter/subscribe` with the same
   name/email/locale already entered in the contact form — a second subscription channel that
   reuses data the visitor already typed, no extra fields. Treat the newsletter call as
   best-effort: if it fails (e.g. already subscribed), don't block or error out the contact
   submission itself — the message send is the primary action, the subscribe is a bonus.
   - `src/app/api/contact/route.ts` — either the client fires both requests
     (`POST /api/contact` then `POST /api/newsletter/subscribe`) sequentially after a successful
     contact submit, or the contact route itself accepts an optional `subscribeToNewsletter:
boolean` and calls `newsletterService`/subscribe logic server-side in the same request.
     Prefer the server-side option — one request, one place to reuse the existing
     `newsletterSubscribeSchema`/service, and it survives the client not waiting for a second
     round-trip.
3. i18n: add `newsletter.signup.*` keys (email placeholder, submit, success, error, already
   subscribed) to `he.json`/`en.json`, plus a `contact.newsletterOptIn` label for the checkbox.

---

## 🔴 E. Category admin is create-only (no edit/reorder/deactivate)

**Root cause:** `src/app/api/admin/categories/route.ts` exposes `GET` + `POST` only (per
`.claude/docs/13-category-taxonomy.md`'s original plan, which explicitly deferred this — see its
"Open decisions" section). Categories can only be created inline from
`src/features/admin/products/ProductFormPage.tsx`'s product form; there's no way to rename, fix a
typo, reorder (`sortOrder`), or deactivate (`isActive`) a category afterward, despite the
storefront actively depending on both fields (`src/server/services/categoryService.ts:8-9`).

**Decision: full CRUD (add/edit/remove), placed under the existing `/admin/products` section**
rather than a new top-level nav item — categories (and colors, see G) are product-scoping data,
not a distinct admin domain of their own.

**Fix:**

- `src/app/api/admin/categories/[id]/route.ts` (new) — `PATCH` (admin-only, mirrors
  `src/app/api/admin/colors/[id]/route.ts` if it exists, else the coupon edit-route pattern):
  accepts `name_he`, `name_en`, `sortOrder`, `isActive`, partial update.
- `src/app/api/admin/categories/[id]/toggle/route.ts` (new) — mirrors
  `src/app/api/admin/coupons/[id]/toggle/route.ts` to flip `isActive` from a list-row action.
- Admin UI: add a "Categories" management view reachable from within the Products admin area
  (e.g. `/admin/products/categories`, linked as a sub-tab/button from `ProductsListPage.tsx` —
  not a new top-level `AdminShell` nav entry). Table: name_he/en, sortOrder, isActive toggle,
  inline edit. This replaces the inline "+ New category" picker inside `ProductFormPage.tsx` as
  the primary management surface — the product form's category `<Select>` can keep a lightweight
  "+ New category" shortcut for speed while editing a product, but renaming/reordering/
  deactivating happens on the new management view.
- `createCategorySchema` already accepts `sortOrder` (per the original plan) but the admin UI
  never sends it on create — add a `sortOrder` input to the create form too, not just edit.

---

## 🔴 F. `ProductVariant.diameter` has no admin input

**Root cause:** `ProductDetail.tsx:88,106` uses `variant.diameter` for round-product custom
pricing, and `CustomPricingRule.pricePerCmDiameter`/`minWidth`-family fields exist for exactly
this. But the admin variant table (`ProductFormPage.tsx:841,870-883`) only has inputs for
width/height/depth — there's no way to enter a variant's diameter through the UI.

**Decision: add it.**

**Fix:** add a `diameter` number input to the variant row editor in `ProductFormPage.tsx`,
alongside width/height/depth (same optional-`Decimal` pattern). Confirm the variant create/update
Zod schema in `src/shared/schemas/index.ts` already accepts `diameter` (it should, since the DTO
does) — if not, add it there too.

---

## 🔴 G. `ColorOption` — no edit/delete, `imageUrl` is dead on both sides

**Root cause:** `src/app/api/admin/colors/route.ts` is `GET`+`POST` only, same gap as categories
(D). `imageUrl` is accepted by the create schema but has no admin input field, and the storefront
color swatch (`ProductDetail.tsx:531`) renders `hexCode` only — never `imageUrl`. `isActive`
exists on the model but is never settable in admin and never filtered on the storefront (all
assigned colors always render regardless of `isActive`).

**Decision: wire up `imageUrl` and make Colors fully editable.**

**Fix:**

- **Edit/delete/deactivate:** add `PATCH /api/admin/colors/[id]` + a toggle route, same shape as
  E. Colors gets the same management-view treatment as Categories — a "Colors" view under
  `/admin/products` (e.g. `/admin/products/colors`), same table pattern (name_he/en, hexCode,
  imageUrl, isActive toggle, inline edit), reusing whatever list-page component gets built for E.
- **`imageUrl`:** add an image upload/URL input to the color create/edit form (reusing the
  existing product-image upload flow if there is one), and swap the storefront swatch
  (`ProductDetail.tsx:531`) to show a small thumbnail when `imageUrl` is set, falling back to the
  plain `hexCode` dot otherwise — lets wood-grain/texture finishes be represented properly instead
  of forced into a flat hex color.

---

## 🔴 H. Review bilingual fields can't be backfilled

**Root cause:** Public review submission (`src/features/reviews/ReviewForm.tsx:55-60`, per
`reviews-phase2-plan.md`) writes only the field matching the submitter's current locale
(`comment_he` _or_ `comment_en`), leaving the other permanently `null`. The admin moderation UI
(`ReviewsListPage.tsx`) only approves/rejects/deletes — never edits `comment_he`/`comment_en` — so
there's no way to add the missing translation. This breaks the CLAUDE.md golden rule that every
`_he`/`_en` pair is admin-editable (every other bilingual model in the app already satisfies it).

**Decision: storefront falls back to whichever language exists (primary fix); admin manual
backfill is optional cleanup, not required for every review.**

**Fix — primary (do this):**

- Wherever approved reviews are rendered for display (`ReviewsCarousel.tsx` per
  `reviews-phase2-plan.md`, and anywhere else `comment_he`/`comment_en` is read directly), change
  the read from `locale === 'he' ? review.comment_he : review.comment_en` to a fallback chain:
  `(locale === 'he' ? review.comment_he : review.comment_en) ?? review.comment_he ??
review.comment_en`. A review never silently disappears for a visitor just because it wasn't
  written in their language — it renders in whatever language it has, untranslated.
- Apply the same fallback in `reviewService.getApprovedReviewsForProduct`'s DTO mapping if it
  pre-selects a single comment field server-side, so the API contract carries whichever text
  exists rather than `null`.

**Fix — optional cleanup (do only if/when it's worth admin time on a specific review):**

- `src/app/api/admin/reviews/[id]/route.ts` — extend `PATCH` to also accept `comment_he`/
  `comment_en` edits (admin-only), not just `isApproved`.
- `ReviewsListPage.tsx` — add an edit affordance (inline textarea or small modal) for both
  comment fields per row, alongside the existing approve/unpublish/delete actions. Lower
  priority than the fallback fix above — build it opportunistically, not blocking.

---

## ⚪ I. Coupon `autoApply` has no reader anywhere — deferred, not relevant now

**Root cause:** Admin can mark a coupon `autoApply: true`
(`src/features/admin/coupons/CouponFormPage.tsx:436-448`, persisted in
`src/server/services/adminCouponService.ts`), but nothing on the storefront ever queries for
auto-apply coupons. `CartClient.tsx:293-320` only validates a coupon when the customer types a
code; `orderService.ts:189-200` only validates `input.couponCode` if supplied. A coupon marked
"apply automatically" currently never applies to anything.

**Decision: not relevant for now — deferred.** Left documented here for whenever shop
re-enablement is actually being planned; not part of this pass's working order.

---

## ⚪ J. `singleUsePerCustomer` / `firstOrderOnly` not enforced — deferred, not relevant now

**Root cause:** `validateCoupon()` (`src/server/services/orderService.ts:65-117`) checks
`isActive`, `validFrom`/`validUntil`, `maxUses`/`usedCount`, `minOrderAmount` — never
`singleUsePerCustomer` or `firstOrderOnly`. There's no customer/order lookup in that function at
all, so there's currently no way to know if this is a repeat customer or a repeat use of this
specific code.

**Decision: not relevant for now — deferred**, same as I. Would require looking up prior `Order`
rows by `customerEmail` (the only stable customer identifier in the schema — there's no
`Customer` model) matching `couponCode` (for `singleUsePerCustomer`) or matching any prior order
at all (for `firstOrderOnly`), before the coupon is accepted in `validateCoupon()` — revisit
alongside I when shop re-enablement is planned.

---

## 🟢 K. Cleanup — duplicate `/admin/site-content` route

`src/app/(admin)/admin/content/page.tsx` and `src/app/(admin)/admin/site-content/page.tsx` render
the identical `SiteContentPage` component. Only `/admin/content` is linked from
`src/features/admin/AdminShell.tsx` nav and the dashboard. Delete the unlinked
`src/app/(admin)/admin/site-content/` route entirely (harmless dead route, but confusing to find
two admin pages with overlapping names while working on A/B above).

---

## Suggested working order

All decisions are made — nothing below is blocked on a product call anymore.

1. **K** (trivial, do first — one deletion, avoids confusion while touching Content admin for A/B).
2. **A, B** together (same `SiteContentPage.tsx` file — both are now deletions, not new wiring).
3. **C** (email) — isolated, high real-world impact, no dependency on anything else.
4. **E, G** together (Category + Color admin CRUD under `/admin/products` — same shape of fix,
   build the shared list-page pattern once and reuse it for both; G additionally wires the
   `imageUrl` texture swatch).
5. **F** (variant diameter) — small, isolated.
6. **H** (review-language fallback) — small, isolated; the optional admin backfill edit can trail
   behind whenever convenient.
7. **D** (newsletter signup form + contact-page opt-in checkbox).
8. **I, J** — deferred, not in this pass. Revisit `.claude/docs/12-showcase-mode.md` when shop
   re-enablement is actually being planned.

## Verification

- `npm run typecheck && npm run lint` after each lettered section (or run `/check`).
- For K: confirm `/admin/site-content` 404s and `/admin/content` still works normally.
- For A/B: confirm the Hero/Story tabs no longer appear in `/admin/content`, and that the
  homepage (`he`/`en`) renders identically to before (static i18n copy, unchanged).
- For C: use the admin "send test email" action, confirm the received email's `From`/`Reply-To`
  headers match the configured `EmailSettings`, not `EMAIL_FROM`; send a real newsletter to a test
  subscriber and confirm the same.
- For E/G: create, rename, reorder, and deactivate a category/color from the new
  `/admin/products/categories` and `/admin/products/colors` views; confirm the storefront
  filter/swatch reflects each change immediately and that products already using a deactivated
  category/color are unaffected; set an `imageUrl` on a color and confirm the storefront swatch
  shows the thumbnail instead of the hex dot.
- For F: set a diameter on a round product's variant, confirm custom pricing on `/product/[slug]`
  reflects it.
- For H: submit a review in `he` only, confirm it still renders (in Hebrew) for an `en`-locale
  visitor instead of disappearing; if the optional admin edit ships, confirm adding `comment_en`
  afterward switches the `en` render to the translated text.
- For D: submit the footer signup form, confirm a row appears in `/admin/newsletter`'s Subscribers
  tab; submit the contact form with the newsletter checkbox checked, confirm a subscriber row is
  also created; submit the contact form with it unchecked, confirm no subscriber row is created.
- For I/J: deferred — no verification needed this pass.

## Non-goals

- No changes to `Bundle` admin (still an intentional phase-2 placeholder — confirmed the
  storefront has zero bundle-rendering code, so this isn't a mismatch, it's not-yet-built).
- No changes to `CustomPricingRule` admin — audit found it correctly wired end to end already.
- No `autoApply`/`singleUsePerCustomer`/`firstOrderOnly` enforcement (I, J) — explicitly deferred,
  not part of this pass.
- No new `Customer` model — if/when J is picked up later, it reuses `customerEmail` matching
  against existing `Order` rows instead.
