# 14 — Instagram integration (plan, not yet implemented)

Staged 2026-07-28 alongside `CHANGES.md` item 11. This is a plan to review and decide on, not a
build spec — has external dependencies outside this codebase (a Meta Developer app, the client's
actual Instagram account type/access) that need answers before implementation starts.

## Current state (confirmed in code)

- **No dedicated model.** Curated posts live as a `SiteContent` JSON blob under key
  `"instagram.highlights"` (`src/server/services/adminInstagramService.ts:6-25`). Item shape
  (`InstagramHighlightDTO`, lines 11-17): `{ id, url, linkUrl?, sortOrder, isActive }` — image URL
  only, no caption, no media-type field.
- **Fully manual today.** Admin uploads each image by hand via `src/features/admin/instagram/InstagramPage.tsx`,
  using the shared `ImageUpload` component (image-only, no video support), reorders via up/down
  arrows (`PATCH /api/admin/instagram/:id`, swapped `sortOrder`).
- **Storefront** (`src/features/home/InstagramSection.tsx`): 3-column grid, plain `<img>` per tile
  (lines 73-78), links out to `linkUrl` or the account's `instagramUrl` if set. Placeholder grid
  shown when empty (lines 97-123). **No video rendering anywhere in the codebase today** — would
  need to be built from scratch (no `<video>` usage found in `ImageGallery`, Gallery admin, or
  anywhere else to adapt from).
- **No prior scoping.** Grepped the whole repo for `graph.instagram`, `Instagram Graph`,
  `INSTAGRAM_ACCESS_TOKEN` — zero hits anywhere, including `.env.example` and `.claude/docs/`.
  This is a clean-slate integration.

## What the client wants

- Connect the real LUMA Instagram account to the site (not manual re-upload).
- `InstagramSection` still shows exactly 6 posts; video posts autoplay in a loop.
- In the admin Instagram page, the admin picks which posts (from the real account) to feature —
  if the API supports listing recent posts, let the admin choose from that list; otherwise fall
  back to simply showing the latest 6 automatically.

## Integration options

### Option A — Instagram API with Instagram Login (current Meta Graph API path)

The old **Instagram Basic Display API** (the lightweight, no-Facebook-Page-required option) was
**shut down by Meta in December 2024**. Its replacement is the **Instagram API with Instagram
Login**, part of the Graph API family, which requires the Instagram account to be a **Business or
Creator (professional) account** — a personal account cannot be connected at all.

High-level flow:

1. Create a Meta Developer app, add the "Instagram" product, configure Instagram Login (redirect
   URI, permissions).
2. Client authorizes the app against their Instagram professional account (OAuth) — this yields a
   short-lived token, exchanged server-side for a **long-lived token (~60 days)**.
3. The long-lived token must be **refreshed before expiry** — needs a recurring job. Since this
   project deploys to Vercel (`.claude/docs/10-devops.md`), a **Vercel Cron** hitting a refresh
   route handler is the natural fit (same pattern as the deploy target already assumes).
4. Fetch recent media via `GET /me/media` (fields: `id, media_type, media_url, thumbnail_url,
permalink, caption, timestamp`) — `media_type` is `IMAGE`, `VIDEO`, or `CAROUSEL_ALBUM`; video
   items expose both `media_url` (the actual video file) and `thumbnail_url` (poster frame).
5. Store a synced pool of recent posts server-side; admin selects up to 6 to feature (or the
   storefront defaults to "latest 6" if nothing is manually selected — matches the client's
   fallback request).

**Prerequisites / open questions for the client, before this can start:**

- Is the LUMA Instagram account already a Business or Creator account? (If not, converting it is
  free and quick in the Instagram app, but is a step the client needs to do.)
- Access to create/manage a Meta Developer app under the client's (or agency's) Meta account.
- For a single account used only by its own owner, Meta allows using the app in **development
  mode with the account added as a tester** — this avoids the full App Review process, which is
  normally required for public/multi-user apps. Worth confirming this still holds at
  implementation time (Meta's policies shift).
- Where to store the long-lived token: likely a new field on the existing `business`
  settings blob (`adminSettingsService.ts`), alongside a refresh-cron env var/secret for the
  Meta app credentials.

### Option B — lighter middle ground: paste-a-link import (no Graph API)

Instead of a live API connection, let the admin paste an Instagram post URL and use Instagram's
public **oEmbed** endpoint to pull the image/video/caption automatically (no OAuth, no token
refresh, no Business-account requirement) — still manual per-post, but removes the "download the
image, re-upload it" busywork the client is complaining about. Doesn't give the admin a "pick from
recent posts" list — the admin still needs to know which posts they want and paste each URL. Less
work to build, but doesn't match the client's stated want ("choose from what's on the account").

### Option C — third-party embed widget (e.g. an Instagram-feed embedding library/SaaS)

Outsources the sync entirely to a third-party service that handles the Graph API relationship;
the site just embeds their widget. Fastest to ship, but adds a recurring third-party dependency
and less control over styling/video autoplay behavior (may not fit the "6-tile grid, video loops"
spec exactly) — probably not a fit for this project's fully custom design system.

## Recommendation

**Option A is the right end state** (matches what the client actually asked for — real account
connection, admin picks from real recent posts) but has real prerequisites outside this codebase.
Recommend: confirm the Instagram account is/can-be a professional account, then scope a Meta
Developer app + OAuth connect flow as a dedicated milestone once that's confirmed. Option B could
be a fallback if the client doesn't want to deal with Meta's developer console at all.

## Data model changes (if Option A is chosen)

Extend or replace the `instagram.highlights` blob with two concerns instead of one:

- A **synced pool** (from the Graph API): `{ externalId, mediaType, mediaUrl, thumbnailUrl,
permalink, caption, timestamp }` — refreshed on each cron sync.
- A **featured selection**: which up to 6 items (by `externalId`) the admin has chosen to show,
  falling back to "latest 6 by timestamp" when nothing is explicitly selected — this mirrors the
  client's exact fallback request.

## Storefront changes

`InstagramSection.tsx` needs a `mediaType` branch: video items render
`<video autoPlay loop muted playsInline poster={thumbnailUrl}>` instead of `<img>` — no existing
pattern in the codebase to reuse, this would be new.
