-- M1.28j Part 2 — GalleryImage table + backfill from SiteContent['gallery'].
--
-- NOT YET APPLIED. Per .claude/docs/storage.md Part 2's LIVE-site rule, this must not run
-- against prod without the owner's explicit go-ahead, and it wants the Part 3 maintenance
-- page up first. When approved: run this file's contents via the Supabase SQL Editor (or
-- `prisma migrate deploy`), verify `SELECT count(*) FROM "GalleryImage"` matches the blob
-- length, then run `prisma migrate resolve --applied 20260920120000_gallery_image_table`
-- so Prisma's migration history stays in sync. Do NOT delete the SiteContent 'gallery' row
-- here — that is a separate, manual verify-then-delete step (storage.md Part 2 Step C).

-- Step A — create the table (pure CREATE TABLE, zero risk to any existing table).
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

-- Step B — backfill from the blob, re-indexed by array position (the stored sortOrder
-- values are inconsistent ties — see storage.md Part 4 "Blob cruft").
INSERT INTO "GalleryImage"
  ("id", "url", "title_he", "title_en", "subtitle_he", "subtitle_en",
   "altText_he", "altText_en", "sortOrder", "isActive", "createdAt", "updatedAt")
SELECT
  item->>'id',
  item->>'url',
  COALESCE(item->>'title_he', ''),
  COALESCE(item->>'title_en', ''),
  COALESCE(item->>'subtitle_he', ''),
  COALESCE(item->>'subtitle_en', ''),
  COALESCE(item->>'altText_he', ''),
  COALESCE(item->>'altText_en', ''),
  (ord - 1),
  true,
  now(),
  now()
FROM "SiteContent",
     jsonb_array_elements("value") WITH ORDINALITY AS t(item, ord)
WHERE "key" = 'gallery'
  AND jsonb_typeof("value") = 'array'
  AND item->>'url' IS NOT NULL;
