# storage.md — Plan: storage & content-store cleanup

> **Status:** planned, not implemented.
>
> This doc grew into the umbrella for a linked set of storage / content-store changes, best
> shipped together (or back-to-back) because they share the upload call sites, the gallery
> admin, and one downtime window:
>
> | Part  | What                                                                 | DB change?                  |
> | ----- | -------------------------------------------------------------------- | --------------------------- |
> | **1** | Signed direct-to-Cloudinary uploads (10 MB ceiling, drop `local.ts`) | no                          |
> | **2** | Gallery: `SiteContent['gallery']` blob → `GalleryImage` table        | **yes** (create + backfill) |
> | **3** | Maintenance-mode page + switch (for any gated migration)             | no                          |
> | **4** | `SiteContent` audit — which rows are dead and safe to delete         | no (manual deletes)         |
> | **5** | Why `EmailSettings` stays its own table (analysis, no action)        | no                          |
>
> **LIVE-site rule:** Parts 2's migration + backfill **must not run without the owner's
> explicit go-ahead**, behind the Part 3 maintenance page.

---

# Part 1 — Signed direct-to-Cloudinary uploads

> **Goal:** let admins upload product / gallery / site-content / Instagram / color images up to
> **10 MB** (Cloudinary free-tier ceiling) by uploading straight to Cloudinary from the browser.
> Keep a thin storage-provider abstraction (so a future swap to S3 / UploadThing / Supabase
> Storage stays a contained change) but drop the unused local-disk implementation.

## Why

Today every image upload is a multipart POST to `POST /api/admin/upload`, which runs as a Vercel
Serverless Function and streams the bytes into Cloudinary via `CloudinaryStorageProvider`.

Two problems:

1. **Vercel caps the request body at ~4.5 MB.** Anything larger is rejected with
   `413 FUNCTION_PAYLOAD_TOO_LARGE` _before our handler runs_ — so the code's `MAX_SIZE = 5 MB`
   is already a lie in production; 4.5–5 MB files fail with a generic error.
2. **`MAX_SIZE` can't just be raised.** Bumping it to 10 MB only helps `npm run dev`. Vercel's
   limit is not configurable on Hobby or Pro.

**Fix:** the browser uploads the file **directly to the Cloudinary API**. Our server only issues a
short-lived signature. The large bytes never touch Vercel, so the 4.5 MB wall is gone. New ceiling
is Cloudinary's single-request limit: **10 MB** on the free plan (paid plans go higher; chunked
upload is not worth it for this project).

The local-disk `LocalStorageProvider` is dead code — it writes to `./uploads`, but **nothing serves
`/uploads`** (no route handler, not under `public/`), so those URLs 404. Nobody uses it. It also
doesn't fit the new model (a local disk can't receive a direct browser upload the way a hosted
provider can). Delete `local.ts` — but keep `index.ts` + the interface, reshaped for direct
uploads, as the seam a real alternative provider would plug into later.

### Limits reference

| Layer           | Limit                                                            | After this change              |
| --------------- | ---------------------------------------------------------------- | ------------------------------ |
| Vercel fn body  | ~4.5 MB (not configurable)                                       | not in the upload path anymore |
| Cloudinary free | 10 MB / image, 25 monthly credits (storage+bandwidth+transforms) | the effective ceiling          |
| App `MAX_SIZE`  | 5 MB (server)                                                    | 10 MB client-side pre-check    |

Cloudinary signed browser upload is a standard feature — no plan upgrade, no surcharge beyond the
usual credit usage. An incoming transformation (see step 5) keeps stored masters small.

## Target architecture

```
Browser (admin)                  Vercel fn                       Cloudinary
   |                                 |                               |
   | 1. POST /api/admin/upload  (admin JWT, no body)                 |
   |-------------------------------->| storage.createUploadTicket()  |
   |   UploadTicket { provider, endpoint, fields }                   |
   |<-------------------------------|                                |
   | 2. POST multipart to ticket.endpoint: file + ...ticket.fields   |
   |-------------------------------------------------------------->|
   |                  { secure_url, public_id, ... }                 |
   |<--------------------------------------------------------------|
   | 3. secure_url saved via the normal admin product/gallery/... API (small JSON)
```

The provider abstraction survives, reshaped for direct uploads:

```ts
// src/server/providers/storage/index.ts
export interface UploadTicket {
  provider: string // client picks its response parser off this
  endpoint: string // where the browser POSTs the multipart form
  fields: Record<string, string> // form fields to send alongside `file`
}

export interface StorageProvider {
  createUploadTicket(): Promise<UploadTicket> | UploadTicket
  deleteAsset(key: string): Promise<void> // orphan cleanup
  keyFromUrl(url: string): string | null // public URL -> provider key
}

export async function getStorageProvider(): Promise<StorageProvider> {
  switch (process.env.STORAGE_PROVIDER ?? 'cloudinary') {
    case 'cloudinary':
    default: {
      const { cloudinaryProvider } = await import('./cloudinary')
      return cloudinaryProvider
    }
  }
}
```

**To add a provider later (e.g. S3 presigned POST, UploadThing, Supabase Storage)** the change is
contained to three spots: a new `storage/<provider>.ts` implementing `StorageProvider`, a `case`
in `getStorageProvider`, and a `case` in the client's `urlFromResponse` (step 3). No call-site
changes. `local.ts` is dropped only because a local disk can't accept a direct browser upload —
it's not a fit for this interface, not because abstraction is unwanted.

Deletes still run server-side (orphan cleanup) via `provider.deleteAsset`.

## Implementation steps

### 1. Reshape the storage abstraction — `src/server/providers/storage/`

- **`index.ts`** — replace `UploadFile`/`UploadResult`/`save()` with the `UploadTicket` +
  `StorageProvider` shapes shown above (`createUploadTicket`, `deleteAsset`, `keyFromUrl`).
  `getStorageProvider()` switches on `STORAGE_PROVIDER` (default `cloudinary`).
- **`cloudinary.ts`** — swap the class for a `cloudinaryProvider: StorageProvider` object:

  ```ts
  import 'server-only'
  import { v2 as cloudinary } from 'cloudinary'
  import type { StorageProvider, UploadTicket } from './index'

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  const PRESET = process.env.CLOUDINARY_UPLOAD_PRESET ?? 'luma_signed'

  export const cloudinaryProvider: StorageProvider = {
    createUploadTicket(): UploadTicket {
      const timestamp = Math.round(Date.now() / 1000)
      const signature = cloudinary.utils.api_sign_request(
        { timestamp, upload_preset: PRESET },
        process.env.CLOUDINARY_API_SECRET!
      )
      return {
        provider: 'cloudinary',
        endpoint: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`,
        fields: {
          api_key: process.env.CLOUDINARY_API_KEY!,
          timestamp: String(timestamp),
          upload_preset: PRESET,
          signature,
        },
      }
    },
    async deleteAsset(key) {
      await cloudinary.uploader.destroy(key)
    },
    keyFromUrl(url) {
      // moved verbatim from cloudinaryCleanupService.extractPublicId
    },
  }
  ```

  Folder, allowed formats, and the size/dimension cap live in the **preset** (step 5), so only
  `timestamp` + `upload_preset` need signing. `api_secret` never leaves the server.

- **`local.ts`** — delete (see step 6).

### 2. Slim down `src/app/api/admin/upload/route.ts` → ticket issuer

No more `formData()`, `MAX_SIZE`, `ALLOWED_TYPES`, or buffering the file into the fn.

```ts
import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { getStorageProvider } from '@/server/providers/storage'

export const POST = withAdmin(async () => {
  const storage = await getStorageProvider()
  return NextResponse.json(await storage.createUploadTicket())
})
```

### 3. Shared client helper — `src/lib/uploadImage.ts`

Both current call sites duplicate the fetch. Centralize, and keep the one provider-specific bit
(response → URL) behind a `switch` so a future provider is a one-line addition:

```ts
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX = 10 * 1024 * 1024

function urlFromResponse(provider: string, body: any): string {
  switch (provider) {
    case 'cloudinary':
      return body.secure_url
    default:
      throw new Error(`Unknown storage provider: ${provider}`)
  }
}

export async function uploadImage(file: File, token: string): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error('סוג קובץ לא נתמך')
  if (file.size > MAX) throw new Error('הקובץ גדול מדי (עד 10MB)')

  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('שגיאה בהעלאה')
  const ticket = (await res.json()) as {
    provider: string
    endpoint: string
    fields: Record<string, string>
  }

  const fd = new FormData()
  fd.append('file', file)
  for (const [k, v] of Object.entries(ticket.fields)) fd.append(k, v)

  const up = await fetch(ticket.endpoint, { method: 'POST', body: fd })
  const body = await up.json().catch(() => ({}))
  if (!up.ok) throw new Error(body?.error?.message ?? 'שגיאה בהעלאה')
  return urlFromResponse(ticket.provider, body)
}
```

Optional enhancement: use `XMLHttpRequest` for the `ticket.endpoint` POST to get
`upload.onprogress` for a real progress bar (the proxy approach can't do this today).

> **i18n note:** these Hebrew strings are hardcoded — matching the _existing_ `ImageUpload.tsx`,
> which already violates golden rule #1. Pulling all upload strings into `he.json`/`en.json` is a
> nice-to-have to fold into this change, not a blocker.

### 4. Update call sites

- `src/components/ui/ImageUpload.tsx` — `handleFile` becomes `onChange(await uploadImage(file, token))`.
- `src/features/admin/products/ProductFormPage.tsx` — `handleImageFiles` swaps its inline
  `fetch('/api/admin/upload', { body: fd })` for `uploadImage(file, token)`.
- No change needed in `GalleryPage`, `InstagramPage`, `SiteContentPage`, `ColorsListPage` — they
  all go through `ImageUpload`.
- `ProductFormPage.tsx:1155` copy: `עד 5MB` → `עד 10MB` (and the same in any other helper text).
- **Public review uploader** (added in M1.28i): `src/components/ui/PublicImageUpload.tsx` posts to
  `POST /api/reviews/upload` (currently the old proxy pattern, byte-validated server-side). Fold it
  into the ticket model here — it becomes a **public, rate-limited** ticket issuer
  (`storage.createUploadTicket()` keeping its own `checkRateLimit`); `PublicImageUpload` switches to
  the shared `uploadImage()` helper (no token). It's the only non-admin upload path, so the ticket
  endpoint's rate limit + the preset's size/format cap stay load-bearing. Update `reviews.formImageHint`
  copy `עד 5MB` → `עד 10MB` too.

### 5. Cloudinary dashboard setup (one-time, manual)

Since there's no server-side byte validation anymore, the preset _is_ the guardrail:

- Create a **signed** upload preset named `luma_signed`:
  - **Folder:** `luma` (keeps `public_id` = `luma/…`, so `keyFromUrl` + orphan cleanup keep working unchanged)
  - **Allowed formats:** `jpg, png, webp, gif`
  - **Max file size:** `10485760` (10 MB)
  - **Incoming transformation:** `c_limit,w_2500,h_2500,q_auto` — downscales a 9 MB phone photo to
    ~1–2 MB on the way in, protecting the 25-credit monthly budget.
  - Unique filename: on. Overwrite: off.
- Confirm the account has "unsigned uploading" restrictions as desired — we only use signed.

`next.config.ts` already whitelists `res.cloudinary.com` in `images.remotePatterns` — no change.

### 6. Drop the local-disk implementation (keep the abstraction)

Delete:

- `src/server/providers/storage/local.ts` — the only file removed. A local disk can't receive a
  direct browser upload, so it can't implement the new `StorageProvider` shape.
- the `uploads/` directory + `.gitignore` lines 29–30 (`uploads/`, `!uploads/.gitkeep`)

Keep, reshaped per step 1:

- `src/server/providers/storage/index.ts` — `UploadTicket` + `StorageProvider` interface +
  `getStorageProvider()` (now switches on `STORAGE_PROVIDER`, still async so the SDK stays out of
  the bundle until used).
- `src/server/providers/storage/cloudinary.ts` — `cloudinaryProvider` object.

Rewire the cleanup service to be provider-agnostic:

- `src/server/services/cloudinaryCleanupService.ts` — move `extractPublicId` into
  `cloudinaryProvider.keyFromUrl`. `deleteIfOrphaned` becomes:
  ```ts
  const storage = await getStorageProvider()
  const key = storage.keyFromUrl(url) // replaces the res.cloudinary.com string check
  if (!key) return
  if ((await getAllDbImageUrls()).has(url)) return
  await storage.deleteAsset(key) // replaces storage.delete(publicId)
  ```
  `extractUrlsFromValue` / `getAllDbImageUrls` stay as-is. Consumers
  (`adminProductService`, `adminGalleryService`, `adminInstagramService`, `adminSiteContentService`)
  only import `deleteIfOrphaned` — untouched. Consider renaming the file to `imageCleanupService.ts`
  since it's no longer Cloudinary-specific (optional; touches 4 import lines).

Env:

- Rename `STORAGE_DRIVER` → `STORAGE_PROVIDER` (values: `cloudinary`; default `cloudinary`). Keep
  the var so a future provider is env-switchable, not a code edit.
- Drop `UPLOAD_DIR` everywhere: `.claude/docs/10-devops.md` (env block + "Storage abstraction"
  section), `.claude/TODO.md:24,54`, `.claude/ROADMAP.md:106-107,411`.
- Keep `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`.
- Add `CLOUDINARY_UPLOAD_PRESET` (optional; defaults to `luma_signed` in code).

### 7. Doc updates

- `CLAUDE.md` stack table — "Cloudinary (primary); local disk fallback for offline dev" →
  "Cloudinary — signed direct browser upload (provider abstraction retained)".
- `.claude/docs/04-api-contract.md:56` — `POST /api/admin/upload` row: now "returns a signed
  `UploadTicket` for direct browser upload (admin only)", not "Image upload (multipart)".
- `.claude/docs/08-admin-panel.md:63,68,123` — describe the direct-upload flow.
- `.claude/docs/10-devops.md:97-113` — update "Storage abstraction": new `StorageProvider` shape
  (`createUploadTicket`/`deleteAsset`/`keyFromUrl`), `STORAGE_PROVIDER` env, `local.ts` removed,
  add the 3-spot "add a provider" checklist.
- `read/CLAUDE-CODE-PROMPT.md:239` — note local fallback removed; abstraction kept.
- `.claude/PROGRESS.md` — append an entry; tick relevant `.claude/ROADMAP.md` boxes.

## Security / correctness notes

- `api_key` in the browser is expected and safe — a request is useless without a signature, and
  signatures are scoped to the exact signed params. `api_secret` stays server-side.
- Signature endpoint is `withAdmin`-guarded; a non-admin can't obtain one.
- Cloudinary rejects stale timestamps (~1 h skew) — signatures are effectively short-lived.
- Signed preset means a leaked signature can only create assets under `luma/` within format/size
  limits — no account-wide write.
- Orphan cleanup is unaffected: URLs are still `https://res.cloudinary.com/<cloud>/image/upload/…`
  and `public_id` is still `luma/<name>` because the preset sets the folder.

## Test checklist

- [ ] Upload a 500 KB PNG → appears, saves, renders on storefront.
- [ ] Upload an 8 MB JPEG → succeeds (would have 413'd before); stored master is downscaled.
- [ ] Upload a 12 MB file → client pre-check blocks it with the Hebrew message, no network call.
- [ ] Upload a `.pdf` renamed to `.jpg` → Cloudinary rejects; error surfaces in the UI.
- [ ] Non-admin token → `POST /api/admin/upload` returns 401.
- [ ] Replace an existing product image, save → old asset removed from Cloudinary by orphan cleanup.
- [ ] Multi-file product upload (`handleImageFiles`) → all rows resolve, primary flag on first.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` clean.

## Rollout order

1. Cloudinary dashboard: create `luma_signed` preset (step 5).
2. Ship steps 1–7 in one PR: reshaped abstraction + ticket endpoint + client helper + call-site
   swaps + `local.ts` deletion + doc updates. The old proxy behaviour is fully replaced in the
   same deploy — there is no dual path to feature-flag.
3. Verify env vars in Vercel: rename `STORAGE_DRIVER` → `STORAGE_PROVIDER`, remove `UPLOAD_DIR`,
   confirm `CLOUDINARY_*` set, optionally add `CLOUDINARY_UPLOAD_PRESET`.

## Future: adding a second provider (reference)

Not part of this work — but the abstraction is kept specifically so this stays a 3-file change:

1. `src/server/providers/storage/<provider>.ts` — implement `StorageProvider`
   (`createUploadTicket` returns that provider's presigned endpoint + fields; `deleteAsset`;
   `keyFromUrl`).
2. `getStorageProvider()` in `index.ts` — add a `case`.
3. `urlFromResponse()` in `src/lib/uploadImage.ts` — add a `case` for that provider's upload
   response shape (or a deterministic URL from the ticket).

No call-site, component, or cleanup-service changes. Switch live via `STORAGE_PROVIDER`.

---

# Part 2 — Gallery: `SiteContent['gallery']` blob → `GalleryImage` table

> **Status:** planned, not implemented.
> **Why it lives here:** the gallery admin is one of the upload call sites this doc already
> touches, and this migration + the maintenance-mode plan below are the reason the storage
> work needs a downtime window. Do the table migration and the upload rework in the same PR
> or back-to-back.
> **LIVE-site rule:** this needs a real schema migration **and a data backfill**. It **must
> not run without the owner's explicit go-ahead**, and it wants the maintenance page
> ([Part 3](#part-3--maintenance-mode-for-migrations-that-need-a-downtime-window)) up while
> the backfill runs.

## Why move it out of `SiteContent`

Today the whole gallery is one JSON array in `SiteContent` where `key = 'gallery'`
(`adminGalleryService.ts`), shape per item:

```ts
{
  ;(id, url, title_he, title_en, subtitle_he, subtitle_en, altText_he, altText_en, sortOrder)
}
```

Problems, same class as the reviews-JSON problem in
[`16-reviews-and-testimonials.md`](16-reviews-and-testimonials.md):

- **Read-modify-write the entire array for every edit.** `GalleryPage.tsx` `persistOrder()`
  fires one `PATCH` per row in `Promise.all` after a drag — each handler loads the full
  array, mutates one item, writes the whole thing back. Concurrent writes (two fields saved
  quickly, or a reorder mid-edit) silently clobber each other; there's no row-level
  concurrency.
- **No query / index.** Can't `where`, can't order in the DB, can't paginate, can't count.
  Everything is "load all, sort in JS".
- **No FK.** A gallery image can never reference a product / category without putting an
  ID string in JSON and hoping it stays valid.
- **Inconsistent with the rest of the catalog.** `ProductImage` is already a real table
  with `url / altText_he / altText_en / sortOrder / isPrimary`. Gallery should match.
- **Orphan cleanup is indirect.** `getAllDbImageUrls()` has to recurse every `SiteContent`
  blob to find gallery URLs; a real column is a two-line `findMany`.

`gallery.intro` (the page heading/subtitle shown above the grid) **stays in `SiteContent`** —
it is genuine site-copy, exactly like `about.page`, and has none of the problems above.

## Schema — `prisma/schema.prisma`

```prisma
model GalleryImage {
  id          String   @id @default(cuid())
  url         String
  title_he    String   @default("")
  title_en    String   @default("")
  subtitle_he String   @default("")
  subtitle_en String   @default("")
  altText_he  String   @default("")
  altText_en  String   @default("")
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)   // soft-hide without deleting the asset
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([sortOrder])
}
```

`title/subtitle/altText` default to `""` to match the current "older items simply lack the
keys" tolerance in `adminGalleryService.ts`. `isActive` is new (the JSON shape had no
hide flag) — default `true` keeps every backfilled row visible.

### Migration + backfill (two steps, one deploy)

**Step A — create the table** (`prisma migrate dev --name gallery_image_table`):

```sql
CREATE TABLE "GalleryImage" (
  "id" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "title_he" TEXT NOT NULL DEFAULT '',
  "title_en" TEXT NOT NULL DEFAULT '',
  "subtitle_he" TEXT NOT NULL DEFAULT '',
  "subtitle_en" TEXT NOT NULL DEFAULT '',
  "altText_he" TEXT NOT NULL DEFAULT '',
  "altText_en" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GalleryImage_sortOrder_idx" ON "GalleryImage"("sortOrder");
```

Pure `CREATE TABLE` — **zero risk to any existing table**, safe to run any time. luma-manager
never touches it.

**Step B — backfill from the blob.** Add it to the same migration file _after_ the
`CREATE TABLE`, so `prisma migrate deploy` runs it atomically in production:

```sql
INSERT INTO "GalleryImage"
  ("id", "url", "title_he", "title_en", "subtitle_he", "subtitle_en",
   "altText_he", "altText_en", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  item->>'id',                       -- all 10 prod rows have a gi_* id; no fallback needed
  item->>'url',
  COALESCE(item->>'title_he', ''),
  COALESCE(item->>'title_en', ''),
  COALESCE(item->>'subtitle_he', ''),
  COALESCE(item->>'subtitle_en', ''),
  COALESCE(item->>'altText_he', ''),
  COALESCE(item->>'altText_en', ''),
  (ord - 1),                         -- re-index by array position; stored sortOrder is inconsistent (three items at 1, two at 3)
  true,
  now(),
  now()
FROM "SiteContent",
     jsonb_array_elements("value") WITH ORDINALITY AS t(item, ord)
WHERE "key" = 'gallery'
  AND jsonb_typeof("value") = 'array'
  AND item->>'url' IS NOT NULL;
```

Verified against the owner's 2026-09-09 export: 10 items, every one has a `gi_*` `id`, a
Cloudinary `url`, and `altText_he`/`altText_en` set (all `title`/`subtitle` empty). The
stored `sortOrder` is `1,1,1,3,5,3,6,7,8,9` — meaningless ties — so the backfill re-indexes
by array order.

**Step C — verify, then drop the blob (manual, not in the migration).** After confirming
`SELECT count(*) FROM "GalleryImage"` matches the blob length and the storefront renders:

```sql
DELETE FROM "SiteContent" WHERE key = 'gallery';
```

Leaving the `gallery` row in place is harmless (nothing reads it post-migration) — but
delete it so it doesn't mislead later. It's on the
[SiteContent cleanup list](#part-4--sitecontent-audit).

## Code changes

**`src/server/services/adminGalleryService.ts`** — swap the `loadItems`/`saveItems` JSON
helpers for Prisma; **keep every exported function's name and signature identical** so no
caller changes:

- `listGalleryImages()` → `prisma.galleryImage.findMany({ orderBy: { sortOrder: 'asc' } })`
  (public callers can add `where: { isActive: true }` — see below).
- `createGalleryImage(data)` → `prisma.galleryImage.create`; `sortOrder` default = current
  `max(sortOrder) + 1` (one `aggregate` call instead of loading all).
- `updateGalleryImage(id, data)` → `prisma.galleryImage.update`; on `url` change,
  `deleteIfOrphaned(oldUrl)` (unchanged behaviour — fetch the row first for the old url).
- `deleteGalleryImage(id)` → `prisma.galleryImage.delete` + `deleteIfOrphaned`.
- Reorder: `persistOrder` in `GalleryPage.tsx` can stay as-is (N patches), or — better, now
  that it's a table — add a single `PATCH /api/admin/gallery/reorder` taking `string[]` of
  ids and doing one `$transaction` of `update`s. Optional; the N-patch path is no longer
  racy against a shared blob once each row is independent.

**Public vs admin visibility** — `listGalleryImages()` currently serves both the admin
(`/api/admin/gallery`) and the storefront (`/api/gallery`, `GallerySection`,
`gallery/page.tsx`). Split: `listGalleryImages({ activeOnly }: { activeOnly?: boolean })` —
storefront passes `activeOnly: true`, admin gets everything. Default `false` keeps the type
change contained.

**`src/app/api/gallery/route.ts`** — currently reads the `SiteContent` blob directly
(`prisma.siteContent.findUnique({ where: { key: 'gallery' } })`). Repoint to
`listGalleryImages({ activeOnly: true })`.

**`src/server/services/cloudinaryCleanupService.ts`** — in `getAllDbImageUrls()` add
`prisma.galleryImage.findMany({ select: { url: true } })`. The `SiteContent` recursion can
stay (it'll just never find gallery urls there anymore).

**`prisma/seed.ts`** — the seed doesn't currently create a `gallery` blob (images are
admin-added only; only `gallery.intro` is seeded, at `seed.ts:700`). If you want seeded
sample gallery images, add a `prisma.galleryImage.createMany` block; otherwise no change.

**`src/features/admin/gallery/GalleryPage.tsx`** — no shape change (`GalleryImageDTO` is the
same). Optionally surface the new `isActive` toggle per row.

**Docs** — `.claude/docs/02-data-models.md` (add `GalleryImage`, note gallery left
`SiteContent`), `.claude/docs/04-api-contract.md` (`/api/gallery` source), the "no dedicated
GalleryImage model" note at the top of `adminGalleryService.ts` gets deleted.

## Verification

- `npm run typecheck && npm run lint && npm run test && npm run build` clean.
- Dev DB: run the migration; `SELECT count(*)` on `GalleryImage` == blob length; every
  `url`/`sortOrder` matches.
- `/gallery` and the home `GallerySection` render identically before/after; lightbox
  captions unchanged; order preserved.
- Admin: add / edit text / reorder (drag) / delete an image → all persist; deleting removes
  the Cloudinary asset via orphan cleanup; `isActive: false` hides it from the storefront
  but not the admin.
- `grep -rn "key: 'gallery'\|key = 'gallery'\|'gallery' }" src/` → only `gallery.intro`
  remains.

---

# Part 3 — Maintenance mode (for migrations that need a downtime window)

> **Status:** planned, not implemented. Small, reusable — every consent-gated migration in
> `16-reviews-and-testimonials.md` and Part 2 above can put this up while it runs.

## Goal

A single switch that shows visitors a branded **"האתר בתחזוקה / We'll be back soon"** page
on every storefront route, while **`/admin/*` and `/api/admin/*` stay fully usable** so work
can continue, plus a private bypass so the owner can smoke-test the real site behind the
curtain.

## Mechanism

The existing `src/middleware.ts` already gates routes (the `FEATURES.shop` block) and its
`matcher` already excludes `api`, `admin`, `_next`, `_vercel`, and static files — so a
maintenance check added there **cannot** touch the admin panel or admin API. That's the hook.

**Toggle source — pick one:**

| Option                                                      | Toggle speed                        | Notes                                                                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`MAINTENANCE_MODE` env var** (recommended for simplicity) | ~1 min (triggers a Vercel redeploy) | `process.env.MAINTENANCE_MODE === '1'`. Zero infra. The redeploy delay is fine — you're about to deploy migration code anyway.                                     |
| **Vercel Edge Config**                                      | instant, no redeploy                | `@vercel/edge-config` read in middleware. Better if you expect to flip it on/off a few times during a long migration. Adds one dependency + the Edge Config store. |
| ~~`SiteContent` flag~~                                      | —                                   | Rejected: needs a DB read in middleware (Prisma in edge middleware is painful) and the DB is the thing being migrated.                                             |

**Bypass:** `?bypass=<MAINTENANCE_BYPASS_SECRET>` on any URL → middleware sets a
`maint-bypass` cookie (httpOnly, `SameSite=Lax`, ~8 h) and redirects to the clean URL.
Requests carrying a valid cookie skip the maintenance rewrite.

## Implementation

1. **`src/app/maintenance/page.tsx`** — a **static, DB-free, bilingual** page (its own tiny
   route outside `[lang]`, so next-intl routing never touches it). Warm/natural aesthetic per
   `07-design-system.md`; logo, one line he + one line en, and a WhatsApp + Instagram link
   built from **`NEXT_PUBLIC_*` env vars** (not `getSiteSettings()` — the DB may be
   mid-migration). `export const dynamic = 'force-static'`.

2. **`src/lib/maintenance.ts`** — `export const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === '1'`
   (or the Edge Config read), mirroring `src/lib/featureFlags.ts`.

3. **`src/middleware.ts`** — at the very top of `middleware()`, before the intl handling:

   ```ts
   if (MAINTENANCE_MODE) {
     const { pathname, searchParams } = request.nextUrl
     const bypassOk =
       request.cookies.get('maint-bypass')?.value === process.env.MAINTENANCE_BYPASS_SECRET
     if (searchParams.get('bypass') === process.env.MAINTENANCE_BYPASS_SECRET) {
       const url = request.nextUrl.clone()
       url.searchParams.delete('bypass')
       const res = NextResponse.redirect(url)
       res.cookies.set('maint-bypass', process.env.MAINTENANCE_BYPASS_SECRET!, {
         httpOnly: true,
         sameSite: 'lax',
         maxAge: 60 * 60 * 8,
         path: '/',
       })
       return res
     }
     if (!bypassOk && pathname !== '/maintenance') {
       return NextResponse.rewrite(new URL('/maintenance', request.url)) // 200, URL unchanged
     }
   }
   ```

   `admin` / `api` are already outside the `matcher`, so they're never affected. Add
   `/maintenance` to the matcher's allow-through if needed, or just let the
   `pathname !== '/maintenance'` guard handle the loop.

4. **`next.config.ts`** — optionally send `Retry-After` + `503` for the maintenance route
   (SEO-correct "temporary"). A `rewrite` keeps a `200`; to return `503` use a route handler
   or `headers()` config on `/maintenance`. Nice-to-have, not required for a short window.

5. **Env** (`.env.example`, Vercel, `.claude/docs/10-devops.md`):
   `MAINTENANCE_MODE` (`0`/`1`), `MAINTENANCE_BYPASS_SECRET` (random string),
   `NEXT_PUBLIC_WHATSAPP_NUMBER` / `NEXT_PUBLIC_INSTAGRAM_URL` if not already public.

## Migration-day runbook (reused by any gated migration)

1. Merge the migration + app-code PR to a deploy branch (don't promote yet).
2. Set `MAINTENANCE_MODE=1` in Vercel → redeploy current prod (page goes up, admin still in).
3. Take a Supabase backup / snapshot.
4. Run the migration: `prisma migrate deploy` (via the deploy, or a one-off against
   `DIRECT_URL`). Run any manual verify queries.
5. Promote the app-code deploy.
6. Smoke-test through `?bypass=<secret>`: storefront, the migrated feature, admin.
7. Set `MAINTENANCE_MODE=0` → redeploy. Verify the site is public and healthy.
8. Do the manual "drop the old blob / SiteContent row" cleanups (Part 2 Step C, doc 16's
   testimonials row).

## Verification

- `MAINTENANCE_MODE=1` locally → every storefront route shows `/maintenance`, URL unchanged;
  `/admin` and `/api/admin/*` work normally; `?bypass=<secret>` unlocks the real site for
  that browser; wrong secret does nothing.
- `MAINTENANCE_MODE=0` → site normal, no `maint-bypass` cookie needed.
- The maintenance page renders with the DB unreachable (kill the dev DB connection and load
  it).

---

# Part 4 — SiteContent audit

Snapshot of what every `SiteContent.key` is, from a full code read (2026-09-09). Run this to
see what's actually in the DB:

```sql
SELECT key, pg_column_size(value) AS bytes, "updatedAt"
FROM "SiteContent" ORDER BY key;
```

### Actual production contents (owner's export, 2026-09-09)

11 rows: `about.page`, `contact.info`, `faq.items`, `footer`, `gallery`, `gallery.intro`,
`home.hero`, `home.story`, `home.testimonials`, `instagram.highlights`, `settings`.

Notably **absent**: `faq` (the dead parallel key was never actually written) and
`home.contact` (the storefront reads it but it's never been saved — the contact section
runs entirely on `HOME_CONTACT_DEFAULTS` + i18n today).

### Keep — actively read by the storefront

| key                    | read by                                          | notes                                                                         |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| `settings`             | `getSiteSettings()` — layout + most pages        | business / shipping / delivery config. **Critical.** Holds the real biz info. |
| `footer`               | `StorefrontLayout.tsx`                           | footer tagline only                                                           |
| `home.hero`            | `(storefront)/page.tsx` → `HeroSection`          | override, i18n fallback. Real content set.                                    |
| `home.story`           | `(storefront)/page.tsx` → `StorySection`         | override + image, i18n fallback. **Has stale sub-keys** — see below.          |
| `about.page`           | `about/page.tsx`                                 | about copy + image. Real content set.                                         |
| `faq.items`            | `faq/page.tsx` **and** `product/[slug]/page.tsx` | **the live FAQ** — 8 items, real content                                      |
| `gallery`              | `adminGalleryService` / `/api/gallery`           | 10 images → **moves to `GalleryImage` in Part 2, then delete this row**       |
| `gallery.intro`        | `gallery/page.tsx`                               | page heading — stays in SiteContent                                           |
| `instagram.highlights` | `listActiveInstagramHighlights()`                | 6 permalinks                                                                  |

`home.contact` — read by `(storefront)/page.tsx` and `shop/page.tsx` but **the row doesn't
exist**; leave the reader in place (it's a valid "not configured yet" path). If doc 16's
work touches the home footer/contact area, consider whether this section should exist at all.

### Delete — dead, nothing reads them

| key                 | status in prod | why it's dead                                                                                                                                                                                                                                                                                                                                                                       | action                                                                                                                                                                                                                                                                                                                             |
| ------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contact.info`      | **present**    | Never read by any code. Its values are **stale placeholders** (`hello@luma.co.il`, `050-123-4567`, `רחוב האומן 12 תל אביב`) — none match the real business in `settings` (`studiolumadesign3@gmail.com`, `054-2640194`, `עמל 33 חיפה`). Safe to drop.                                                                                                                               | `DELETE FROM "SiteContent" WHERE key = 'contact.info';` + remove the `seed.ts:651` block.                                                                                                                                                                                                                                          |
| `home.testimonials` | **present**    | Goes dead the moment [`16-reviews-and-testimonials.md`](16-reviews-and-testimonials.md) ships. The 3 testimonials there are real customer quotes — **before deleting, the owner should re-enter them via the new admin "New review" flow** (as `APPROVED` + `featuredOnHome`). ⚠️ testimonial #2's `quote_en` is corrupted ("Exactly what weWe ordered…wanted.") — fix on re-entry. | Delete **after** doc 16 lands, with the `TestimonialsTab` removal that plan lists.                                                                                                                                                                                                                                                 |
| `faq` (key)         | **absent**     | The parallel FAQ system (`adminFaqService.ts`, `/api/admin/faq/*`, `GET /api/faq`) was never wired to any UI and never wrote a row. Live FAQ is `faq.items`. Confirmed dead in `ROADMAP.md` M1.28g.                                                                                                                                                                                 | No row to delete. Just delete the dead code: `src/server/services/adminFaqService.ts`, `src/app/api/admin/faq/route.ts`, `src/app/api/admin/faq/[id]/route.ts`, `src/app/api/faq/route.ts`, and `createFaqItemSchema`/`updateFaqItemSchema` in `src/shared/schemas` if unused elsewhere. Rides along with the storage PR (Part 1). |

> The owner deletes `contact.info` (and later `home.testimonials`) manually via `db:studio`
> / SQL — **not** part of any gated migration.

### Blob cruft (optional — clean when next editing that section, no row deletion)

- **`home.story`** carries stale sub-keys the current `StorySection` never reads:
  `body_he` / `body_en` (superseded by `body1_*` / `body2_*`) and `title_he` / `title_en`
  (the component reads `heading_*`). Harmless; the admin `HomeStoryTab` will drop them on
  the next save if it only writes the current shape.
- **`gallery`** `sortOrder` values are inconsistent — `1,1,1,3,5,3,6,7,8,9` (three items at
  `1`, two at `3`). The Part 2 backfill uses `WITH ORDINALITY` (`ord - 1`) as a fallback,
  but given how messy the stored values are, **prefer re-indexing by array position
  outright** — change the backfill's `sortOrder` column to just `(ord - 1)` and drop the
  `COALESCE`. The current storefront order is already whatever `.sort((a,b)=>a.sortOrder-b.sortOrder)`
  makes of these ties, so array order is as good and more predictable.

### Side-note — stale ROADMAP entry

`ROADMAP.md` M1.28d says the `home.hero` / `home.story` admin tabs were "removed as dead
inputs". They are **not** removed — `SiteContentPage.tsx` still renders both tabs and
`(storefront)/page.tsx` still reads both keys (with i18n fallback), and prod has real
content in both. Either re-remove the tabs or fix the roadmap note; not urgent.

---

# Part 5 — Does `EmailSettings` need to be its own table?

**Short answer: no, not really — but the payoff for merging it is small and it's the one
table `luma-manager` might also want. Leave it, and document why.**

### What it holds

`EmailSettings` (`id, fromAddress, fromName_he, fromName_en, replyTo?, updatedAt`) — a
**single upserted row** (`adminEmailSettingsService.ts` does `findFirst()` then
create-if-missing). Read by `adminNotifyService`, `adminNewsletterService`, and the
email-settings route. That is _exactly_ the same "one JSON blob of config" access pattern as
`SiteContent['settings']` (`getSiteSettings()` — `findUnique` then default-if-missing).

### Why it's a separate table today

Nothing principled. It was created in the initial schema (`ROADMAP.md` M1.1) as a peer of
`SiteContent` and never revisited. `02-data-models.md:136` just describes the columns; there
is no stated reason it isn't `SiteContent['email']`. Historically it predates most of the
`SiteContent` keys.

### The case for folding it into `SiteContent['email']`

- One fewer table, one fewer service file, one fewer "findFirst + create default" dance.
- Same shape as every other admin-editable config blob — consistent mental model.
- The generic `PUT /api/admin/site-content/:key` could serve it (like `gallery.intro`),
  though the dedicated `/api/admin/email-settings` route + `EmailServicesPage.tsx` UI would
  still want a typed wrapper.

### The case for leaving it

- **`luma-manager` shares this database.** It sends its own emails (order-status updates).
  A typed `EmailSettings` table is a cleaner shared contract than "reach into luma's
  `SiteContent` JSON and hope the key/shape is stable". If cross-app email config is on the
  horizon, the table is the right home.
- It's **working and wired** (`ROADMAP.md` M1.28d fixed the "email sending ignored
  EmailSettings" bug). Migrating config between stores on a live site is pure risk for a
  cosmetic win.
- `updatedAt` / future audit columns are first-class on a table; in a blob they're manual.

### Recommendation

**Keep `EmailSettings` as a table.** Add one line to `02-data-models.md` explaining the
"why not `SiteContent`": _it's a typed config contract potentially shared with luma-manager,
which sends its own transactional email_. If a future audit finds luma-manager will never
touch it, folding it into `SiteContent['email']` is a safe, low-value cleanup to batch with
other schema work — not worth a dedicated migration.
