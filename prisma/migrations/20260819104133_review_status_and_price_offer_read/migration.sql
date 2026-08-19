-- Review: isApproved (boolean) -> status (enum), preserving existing data
CREATE TYPE "ReviewStatus" AS ENUM ('NEW', 'READ', 'APPROVED', 'REJECTED');

ALTER TABLE "Review" ADD COLUMN "status" "ReviewStatus" NOT NULL DEFAULT 'NEW';

UPDATE "Review"
SET "status" = CASE WHEN "isApproved" THEN 'APPROVED'::"ReviewStatus" ELSE 'NEW'::"ReviewStatus" END;

ALTER TABLE "Review" DROP COLUMN "isApproved";

-- PriceOfferRequest: add the READ state (additive, no data change needed)
ALTER TYPE "PriceOfferStatus" ADD VALUE 'READ';
