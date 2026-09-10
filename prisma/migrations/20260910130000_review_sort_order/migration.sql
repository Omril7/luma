-- Review: admin-controlled display order for the homepage-featured set.
-- Additive, safe DEFAULT — no existing row is rewritten.
-- Written idempotent so a manual SQL-Editor run and a later `prisma migrate deploy`
-- (or `migrate dev` on the dev project) can't collide.

-- AlterTable
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
