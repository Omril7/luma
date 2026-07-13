# 13 — Category Taxonomy (Enum → Admin-Managed Table)

## Why

`Category` is currently a fixed Prisma `enum` (`prisma/schema.prisma:17-27`, 9 values: `TABLE`,
`SHELF`, `CONSOLE`, `SHOE_RACK`, `NIGHTSTAND`, `ARMCHAIR`, `TV_STAND`, `BENCH`, `OTHER`). Adding,
renaming, or removing a category today means a schema migration + code changes in ~10 files.
The business wants to add/remove categories without a deploy.

The codebase already has the right precedent for this: `ColorOption` (`prisma/schema.prisma:122`)
is a bilingual, admin-managed table (`name_he`, `name_en`, `isActive`), not an enum, and `Product`
references it by relation. This plan does the same for `Category`, and reuses the exact CRUD
pattern already shipped for colors (`/api/admin/colors` GET+POST, inline "add new" UI inside
`ProductFormPage`) rather than inventing a new one.

## Data model

### `prisma/schema.prisma`

- Delete `enum Category`.
- Add:

  ```prisma
  model Category {
    id        String   @id @default(cuid())
    name_he   String
    name_en   String
    sortOrder Int      @default(0)
    isActive  Boolean  @default(true)

    products  Product[]
  }
  ```

- `Product.category Category` (enum field) → `Product.categoryId String` +
  `category Category @relation(fields: [categoryId], references: [id])`.
- No `slug` field. Filtering/URL query params (`/shop?category=...`) use `Category.id` directly —
  same convention already used for `colorId`/`variantId` elsewhere. A slug would need uniqueness
  validation and regeneration-on-rename for no real benefit here (categories aren't routed as
  their own pages).
- No hard delete. Categories are deactivated (`isActive: false`) like `ColorOption` and `Product`
  already are — never removed from the DB — so existing products keep a valid `categoryId` even
  after a category is retired. Storefront queries and the "select a category" list in the admin
  product form both filter `isActive: true`; the admin products list/table can still show the
  name for legacy inactive categories via the relation.

### ⚠️ Cross-app risk — verify before migrating

`schema.prisma`'s header states this DB is shared with **luma-manager**
(`C:\Users\omril\Projects\luma-manager`), which reads/updates orders against the same Supabase
project. If luma-manager reads `Product.category` anywhere (e.g. an order-detail view showing
the product's category), dropping the `Category` enum and renaming the column will break it.
**This wasn't checked as part of this plan** — confirm in luma-manager's own codebase/schema
before running the migration in any shared environment (Supabase dev/staging/prod).

## Migration steps

Prisma can't auto-convert an enum column to a FK with data preserved, so this needs to be staged:

1. **Migration A** — add the new `Category` table and a **nullable** `Product.categoryId` column;
   keep the old `Product.category` enum column in place for now (don't drop it yet).
2. **Backfill script** (`prisma/scripts/backfill-categories.ts` or inline in the migration):
   - Insert one `Category` row per existing enum value, using the bilingual labels that already
     exist in `src/i18n/he.json` (`shop.categories.*`) / `en.json` — these are the current
     human-authored names, so reuse them verbatim as the seed data:

     | old enum key | name_he           | name_en     |
     | ------------ | ----------------- | ----------- |
     | TABLE        | שולחנות           | Tables      |
     | SHELF        | מדפים             | Shelves     |
     | CONSOLE      | קונסולות          | Consoles    |
     | SHOE_RACK    | מתלי נעליים       | Shoe Racks  |
     | NIGHTSTAND   | שידות לילה        | Nightstands |
     | ARMCHAIR     | כורסאות           | Armchairs   |
     | TV_STAND     | מזנונים לטלוויזיה | TV Stands   |
     | BENCH        | ספסלים            | Benches     |
     | OTHER        | אחר               | Other       |

   - For each `Product`, set `categoryId` to the new row matching its old `category` value.

3. **Migration B** — make `Product.categoryId` `NOT NULL`, add the FK constraint, drop the old
   `Product.category` column, drop the `Category` enum type.
4. Regenerate the Prisma client (`npx prisma generate`) after each schema change.

### `prisma/seed.ts`

Update the 4 seeded products (`category: 'TABLE'`, `'SHELF'`, `'NIGHTSTAND'`, `'TV_STAND'`) to
first `upsert` the 9 `Category` rows (same table as the backfill data above, so dev resets stay
consistent with the migration), then connect products via `categoryId`.

## Shared layer (`src/shared/`)

- **`constants.ts`**: delete `CATEGORY`, `CATEGORY_VALUES`, and the `Category` type — there's no
  fixed set anymore.
- **`types.ts`**: `ProductDTO.category` changes from `category: Category` (enum) to an embedded
  object, same shape as the other DTO relations already on `ProductDTO`:
  ```ts
  category: {
    id: string
    name_he: string
    name_en: string
  }
  ```
- **`schemas/index.ts`**: the product Zod schema's `category: z.enum(CATEGORY_VALUES as
[string, ...string[]])` → `categoryId: z.string().min(1)`.

## Server (`src/server/`)

- **`productService.ts`**:
  - `productInclude` gains `category: true` (or a `select` of `id, name_he, name_en` if you want
    to keep the payload lean).
  - `GetProductsOptions.category` (currently a `Category` enum-typed filter) becomes
    `categoryId?: string`, filtered as a plain `where: { categoryId: opts.categoryId }` — no more
    `Prisma.EnumCategoryFilter` cast.
  - `toProductDTO` maps `p.category` → `{ id, name_he, name_en }`.
- **`adminProductService.ts`**: replace the three `category as Category` / `category as Category`
  casts (create, update, and the DTO mapper) with plain `categoryId: string` pass-through — no
  cast needed once it's a normal string FK.
- **New route: `src/app/api/admin/categories/route.ts`** — mirrors
  `src/app/api/admin/colors/route.ts` exactly:
  - `GET`: `prisma.category.findMany({ orderBy: { sortOrder: 'asc' } })`, admin-only (`withAdmin`).
  - `POST`: `z.object({ name_he: z.string().min(1).max(100), name_en: z.string().min(1).max(100),
sortOrder: z.number().int().optional() })`, admin-only, `prisma.category.create`.
  - **New route: `src/app/api/admin/categories/[id]/toggle/route.ts`** — mirrors the existing
    `src/app/api/admin/coupons/[id]/toggle/route.ts` pattern to flip `isActive` (deactivate
    instead of delete).
- **`src/app/api/categories/route.ts`** (public, storefront-facing): currently groups products by
  the enum and returns `{ value, count }` filtered to `count > 0`. Rework to:
  ```ts
  prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  })
  ```
  returning `{ id, name_he, name_en, count }`, still filtered to `count > 0` so empty categories
  don't clutter the storefront filter row.
- **`src/app/api/products/route.ts`**: drop the `CATEGORY_VALUES.includes(...)` validity check
  (there's no fixed list to validate against anymore) — an unknown `categoryId` now just yields
  zero results from `getProducts`, same as any other non-matching filter.

## Frontend

- **`src/features/shop/ShopClient.tsx`**: currently renders filter pills from the static
  `CATEGORY_VALUES` import + `t('categories.<KEY>')`. Change to accept the category list (with
  bilingual names + counts) as a prop from the server component (`shop/page.tsx` already calls
  `getProducts`; have it also call the categories query, same pattern the `/api/categories` route
  already uses server-side, and pass the list down — no new client fetch needed). `CategoryPill`
  reads `locale === 'he' ? cat.name_he : cat.name_en` instead of a translation key. The "All"
  pill keeps using `t('allCategories')` (that string isn't category-specific).
- **`src/features/products/ProductDetail.tsx`**: the badge
  `{t(\`category.${product.category}\`)}`→`{locale === 'he' ? product.category.name_he :
  product.category.name_en}`.
- **`src/features/admin/products/ProductFormPage.tsx`**:
  - Delete the hardcoded `CATEGORY_LABELS` / `CATEGORIES` (Hebrew-only, drifted from the real
    i18n labels already — e.g. `SHOE_RACK` is "מדף נעליים" here vs "מתלי נעליים" in `he.json`).
  - Load categories the same way `allColors` is already loaded (`loadColors` at line ~256):
    `GET /api/admin/categories` into `allCategories` state.
  - The category `<Select>` (line ~673) is populated from `allCategories` instead; `form.category`
    becomes `form.categoryId`.
  - Add the same lightweight inline "+ New category" affordance the Colors tab already has
    (`newColor` state / `handleCreateColor`, lines ~235–389) — a small form with `name_he`/
    `name_en` inputs and a create button, no separate admin page needed.
- **`src/features/admin/products/ProductsListPage.tsx`**: same swap — hardcoded
  `CATEGORY_LABELS`/`CATEGORIES` → categories fetched from `/api/admin/categories`, used for both
  the filter dropdown and the table cell label lookup.

## i18n cleanup

Remove `shop.categories.*` (9 keys) and `product.category.*` (9 keys) from `he.json`/`en.json` —
bilingual category names now live solely in the `Category` table, same as `ColorOption` names
never lived in i18n files. Keeping both would let them drift out of sync again (as
`ProductFormPage`'s hardcoded copy already had, see above).

## Open decisions

- **Reordering UX**: `sortOrder` exists on the model, but this plan only exposes it as a plain
  number input when creating a category (matching `Product.sortOrder`'s admin treatment) — no
  drag-to-reorder UI. Fine to add later if the category list grows.
- **Where categories are created**: per the colors precedent, only inline from the product form's
  category picker (no standalone `/admin/categories` page). If you'd rather manage the full list
  (rename, reorder, deactivate) from one place instead of only creating them ad hoc while editing
  a product, say so — that's a bigger admin page, not just a route.
- **`OTHER` category**: currently a catch-all enum value. With a real table, it's just a normal
  row — no special-cased "other" handling needed anywhere in code.

## Rollout / testing checklist

- Migration A + backfill + Migration B run cleanly against the dev Supabase project; `prisma
studio` shows 9 `Category` rows and every `Product.categoryId` populated.
- `/shop` filter pills render the same 9 categories with the same labels as today, in both `he`
  and `en`.
- `/product/[slug]` category badge renders correctly.
- Admin → edit a product → category dropdown shows all active categories; "+ New category"
  creates one and it's immediately selectable and visible on the storefront filter.
- Admin → deactivate a category → it disappears from the "new product" picker and (once no
  active products reference it) from the storefront filter, but any product still assigned to it
  keeps working.
- `npm run typecheck` — the `Category` enum import in `adminProductService.ts` and `types.ts`
  will no longer exist; confirm no stale references remain.
- Run `/check` (typecheck + lint + test) before committing.

## Non-goals

- No slug/URL-friendly category identifier — filtering uses `Category.id`.
- No hard delete of categories.
- No change to `Product.category`'s role in the pricing engine — categories were never priced
  logic, purely a filter/label, so `src/shared/pricing.ts` is untouched.
- No standalone `/admin/categories` management page unless you ask for one instead of the inline
  "+ New category" picker (see Open Decisions).
