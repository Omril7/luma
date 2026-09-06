# storage.md — Plan: signed direct-to-Cloudinary uploads

> **Status:** planned, not implemented.
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
