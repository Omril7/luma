import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'
import type { ProductDTO } from '@/shared/types'

// ── Prisma include shape used across all product queries ──────────────────────

const productInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { where: { isActive: true }, orderBy: { price: 'asc' as const } },
  customPricingRule: true,
  colorOptions: { where: { isActive: true } },
  category: { select: { id: true, name_he: true, name_en: true } },
} satisfies Prisma.ProductInclude

type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>

function toProductDTO(p: ProductWithRelations): ProductDTO {
  return {
    id: p.id,
    slug: p.slug,
    name_he: p.name_he,
    name_en: p.name_en,
    description_he: p.description_he,
    description_en: p.description_en,
    category: { id: p.category.id, name_he: p.category.name_he, name_en: p.category.name_en },
    basePrice: Number(p.basePrice),
    customizable: p.customizable,
    isActive: p.isActive,
    isFeatured: p.isFeatured,
    sortOrder: p.sortOrder,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    images: p.images.map((img) => ({
      id: img.id,
      url: img.url,
      altText_he: img.altText_he,
      altText_en: img.altText_en,
      sortOrder: img.sortOrder,
      isPrimary: img.isPrimary,
    })),
    variants: p.variants.map((v) => ({
      id: v.id,
      name_he: v.name_he,
      name_en: v.name_en,
      width: v.width !== null ? Number(v.width) : undefined,
      height: v.height !== null ? Number(v.height) : undefined,
      depth: v.depth !== null ? Number(v.depth) : undefined,
      diameter: v.diameter !== null ? Number(v.diameter) : undefined,
      price: Number(v.price),
      sku: v.sku,
      isActive: v.isActive,
    })),
    customPricingRule: p.customPricingRule
      ? {
          id: p.customPricingRule.id,
          basedOnVariantId: p.customPricingRule.basedOnVariantId ?? undefined,
          pricePerCmWidth:
            p.customPricingRule.pricePerCmWidth !== null
              ? Number(p.customPricingRule.pricePerCmWidth)
              : undefined,
          pricePerCmHeight:
            p.customPricingRule.pricePerCmHeight !== null
              ? Number(p.customPricingRule.pricePerCmHeight)
              : undefined,
          pricePerCmDepth:
            p.customPricingRule.pricePerCmDepth !== null
              ? Number(p.customPricingRule.pricePerCmDepth)
              : undefined,
          pricePerCmDiameter:
            p.customPricingRule.pricePerCmDiameter !== null
              ? Number(p.customPricingRule.pricePerCmDiameter)
              : undefined,
          minWidth:
            p.customPricingRule.minWidth !== null
              ? Number(p.customPricingRule.minWidth)
              : undefined,
          maxWidth:
            p.customPricingRule.maxWidth !== null
              ? Number(p.customPricingRule.maxWidth)
              : undefined,
          minHeight:
            p.customPricingRule.minHeight !== null
              ? Number(p.customPricingRule.minHeight)
              : undefined,
          maxHeight:
            p.customPricingRule.maxHeight !== null
              ? Number(p.customPricingRule.maxHeight)
              : undefined,
          minDepth:
            p.customPricingRule.minDepth !== null
              ? Number(p.customPricingRule.minDepth)
              : undefined,
          maxDepth:
            p.customPricingRule.maxDepth !== null
              ? Number(p.customPricingRule.maxDepth)
              : undefined,
        }
      : undefined,
    colorOptions: p.colorOptions.map((c) => ({
      id: c.id,
      name_he: c.name_he,
      name_en: c.name_en,
      hexCode: c.hexCode,
      imageUrl: c.imageUrl ?? undefined,
    })),
  }
}

// ── Public queries ─────────────────────────────────────────────────────────────

export type ProductSortKey = 'price_asc' | 'price_desc' | 'newest' | 'name_he' | 'name_en'

const SORT_MAP: Record<ProductSortKey, Prisma.ProductOrderByWithRelationInput> = {
  price_asc: { basePrice: 'asc' },
  price_desc: { basePrice: 'desc' },
  newest: { createdAt: 'desc' },
  name_he: { name_he: 'asc' },
  name_en: { name_en: 'asc' },
}

export interface GetProductsOptions {
  categoryId?: string
  featured?: boolean
  sort?: ProductSortKey
  page?: number
  limit?: number
}

export interface ProductsPage {
  products: ProductDTO[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function getProducts(opts: GetProductsOptions = {}): Promise<ProductsPage> {
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(50, Math.max(1, opts.limit ?? 12))
  const skip = (page - 1) * limit
  const orderBy = SORT_MAP[opts.sort ?? 'newest']

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.featured !== undefined ? { isFeatured: opts.featured } : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({ where, include: productInclude, orderBy, skip, take: limit }),
    prisma.product.count({ where }),
  ])

  return {
    products: products.map(toProductDTO),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export async function getProductBySlug(slug: string): Promise<ProductDTO | null> {
  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: productInclude,
  })
  return product ? toProductDTO(product) : null
}

/** Fetch active products by id, preserving the input order (wishlist / compare lists). */
export async function getProductsByIds(ids: string[]): Promise<ProductDTO[]> {
  if (ids.length === 0) return []
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, isActive: true },
    include: productInclude,
  })
  const byId = new Map(products.map((p) => [p.id, p]))
  return ids.flatMap((id) => {
    const p = byId.get(id)
    return p ? [toProductDTO(p)] : []
  })
}

export async function getProductById(id: string): Promise<ProductDTO | null> {
  const product = await prisma.product.findUnique({
    where: { id, isActive: true },
    include: productInclude,
  })
  return product ? toProductDTO(product) : null
}
