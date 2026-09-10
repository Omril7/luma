-- Review: allow global (product-less) reviews, add optional image + homepage feature flag.
-- Additive except one NOT NULL relax; no existing row is rewritten.
-- Written idempotent so a manual SQL-Editor run and a later `prisma migrate deploy`
-- (or `migrate dev` on the dev project) can't collide.

-- AlterTable
ALTER TABLE "Review" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "featuredOnHome" BOOLEAN NOT NULL DEFAULT false;
