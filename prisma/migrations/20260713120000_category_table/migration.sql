-- Category enum -> admin-managed table (see .claude/docs/13-category-taxonomy.md)
-- Staged in one transaction so existing Product rows keep a valid category throughout:
--   1) decouple Product.category from the enum (cast to TEXT) so the enum type can be
--      dropped early -- required because Postgres enum types and table row-types share
--      the same namespace, so the new "Category" table can't be created while the old
--      "Category" enum type still exists
--   2) add the Category table + a nullable Product.categoryId column
--   3) seed the 9 Category rows and backfill categoryId from the old category text value
--   4) make categoryId required, add the FK, drop the old `category` column

-- ── Stage 1: decouple from the enum, then drop it ─────────────────────────────────

ALTER TABLE "Product" ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;
DROP TYPE "Category";

-- ── Stage 2: additive ──────────────────────────────────────────────────────────

CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name_he" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;

-- ── Stage 3: seed + backfill ─────────────────────────────────────────────────────

INSERT INTO "Category" ("id", "name_he", "name_en", "sortOrder", "isActive") VALUES
    ('cat-table',      'שולחנות',           'Tables',      0, true),
    ('cat-shelf',      'מדפים',             'Shelves',     1, true),
    ('cat-console',    'קונסולות',          'Consoles',    2, true),
    ('cat-shoe-rack',  'מתלי נעליים',       'Shoe Racks',  3, true),
    ('cat-nightstand', 'שידות לילה',        'Nightstands', 4, true),
    ('cat-armchair',   'כורסאות',           'Armchairs',   5, true),
    ('cat-tv-stand',   'מזנונים לטלוויזיה', 'TV Stands',   6, true),
    ('cat-bench',      'ספסלים',            'Benches',     7, true),
    ('cat-other',      'אחר',               'Other',       8, true)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Product" SET "categoryId" = 'cat-table'      WHERE "category" = 'TABLE';
UPDATE "Product" SET "categoryId" = 'cat-shelf'      WHERE "category" = 'SHELF';
UPDATE "Product" SET "categoryId" = 'cat-console'    WHERE "category" = 'CONSOLE';
UPDATE "Product" SET "categoryId" = 'cat-shoe-rack'  WHERE "category" = 'SHOE_RACK';
UPDATE "Product" SET "categoryId" = 'cat-nightstand' WHERE "category" = 'NIGHTSTAND';
UPDATE "Product" SET "categoryId" = 'cat-armchair'   WHERE "category" = 'ARMCHAIR';
UPDATE "Product" SET "categoryId" = 'cat-tv-stand'   WHERE "category" = 'TV_STAND';
UPDATE "Product" SET "categoryId" = 'cat-bench'      WHERE "category" = 'BENCH';
UPDATE "Product" SET "categoryId" = 'cat-other'      WHERE "category" = 'OTHER';

-- ── Stage 4: finalize ────────────────────────────────────────────────────────────

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" DROP COLUMN "category";
