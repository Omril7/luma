import 'server-only'
import { Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'
import type { ProductDTO } from '@/shared/types'
import type {
  CreateProductInput,
  CreateVariantInput,
  CustomPricingRuleInput,
} from '@/shared/schemas'
import { deleteIfOrphaned } from '@/server/services/cloudinaryCleanupService'

// ── Prisma include — all variants/colors (not just active) for admin ──────────

const adminProductInclude = {
  images: { orderBy: { sortOrder: 'asc' as const } },
  variants: { orderBy: { price: 'asc' as const } },
  customPricingRule: true,
  colorOptions: true,
  category: { select: { id: true, name_he: true, name_en: true } },
} satisfies Prisma.ProductInclude

type AdminProductWithRelations = Prisma.ProductGetPayload<{ include: typeof adminProductInclude }>

function toProductDTO(p: AdminProductWithRelations): ProductDTO {
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

async function fetchWithRelations(id: string): Promise<AdminProductWithRelations> {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: adminProductInclude,
  })
  return product
}

// ── List ──────────────────────────────────────────────────────────────────────

export interface ListProductsOptions {
  page?: number
  limit?: number
  categoryId?: string
  search?: string
  isActive?: boolean
}

export async function listAdminProducts(opts: ListProductsOptions = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const limit = Math.min(50, Math.max(1, opts.limit ?? 25))
  const skip = (page - 1) * limit

  const where: Prisma.ProductWhereInput = {
    ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.search
      ? {
          OR: [
            { name_he: { contains: opts.search, mode: 'insensitive' } },
            { name_en: { contains: opts.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: adminProductInclude,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return { products: products.map(toProductDTO), total, page, pages: Math.ceil(total / limit) }
}

// ── Get single ────────────────────────────────────────────────────────────────

export async function getAdminProductById(id: string): Promise<ProductDTO | null> {
  const product = await prisma.product.findUnique({ where: { id }, include: adminProductInclude })
  return product ? toProductDTO(product) : null
}

// ── Create ────────────────────────────────────────────────────────────────────

export interface FullCreateProductInput extends CreateProductInput {
  variants: (Omit<CreateVariantInput, 'isActive'> & { id?: string; isActive?: boolean })[]
  customPricingRule?: CustomPricingRuleInput
  images?: Array<{
    url: string
    altText_he: string
    altText_en: string
    sortOrder?: number
    isPrimary?: boolean
  }>
  colorIds?: string[]
}

export async function createAdminProduct(data: FullCreateProductInput): Promise<ProductDTO> {
  const { variants, customPricingRule, images, colorIds, ...productData } = data

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        ...productData,
        variants: {
          create: variants.map(({ id: _id, isActive, ...v }) => ({
            ...v,
            isActive: isActive ?? true,
          })),
        },
        ...(customPricingRule ? { customPricingRule: { create: customPricingRule } } : {}),
        ...(images?.length ? { images: { create: images } } : {}),
        ...(colorIds?.length ? { colorOptions: { connect: colorIds.map((id) => ({ id })) } } : {}),
      },
    })
    return product.id
  })

  return toProductDTO(await fetchWithRelations(created))
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateAdminProduct(
  id: string,
  data: Partial<FullCreateProductInput>
): Promise<ProductDTO> {
  const { variants, customPricingRule, images, colorIds, ...productData } = data

  // Capture old image URLs before they are deleted so we can clean up orphans
  let oldImageUrls: string[] = []
  if (images) {
    const oldImages = await prisma.productImage.findMany({
      where: { productId: id },
      select: { url: true },
    })
    oldImageUrls = oldImages.map((img) => img.url)
  }

  await prisma.$transaction(async (tx) => {
    if (variants) await tx.productVariant.deleteMany({ where: { productId: id } })
    if (images) await tx.productImage.deleteMany({ where: { productId: id } })
    if (customPricingRule !== undefined)
      await tx.customPricingRule.deleteMany({ where: { productId: id } })

    const { categoryId, ...restProductData } = productData
    await tx.product.update({
      where: { id },
      data: {
        ...restProductData,
        ...(categoryId ? { categoryId } : {}),
        ...(variants
          ? {
              variants: {
                create: variants.map(({ id: _id, isActive, ...v }) => ({
                  ...v,
                  isActive: isActive ?? true,
                })),
              },
            }
          : {}),
        ...(customPricingRule ? { customPricingRule: { create: customPricingRule } } : {}),
        ...(images ? { images: { create: images } } : {}),
        ...(colorIds !== undefined
          ? { colorOptions: { set: colorIds.map((cid) => ({ id: cid })) } }
          : {}),
      },
    })
  })

  // Fire-and-forget orphan cleanup for every image URL that was removed
  const newImageUrls = new Set((images ?? []).map((img) => img.url))
  for (const url of oldImageUrls) {
    if (!newImageUrls.has(url)) {
      deleteIfOrphaned(url).catch(console.error)
    }
  }

  return toProductDTO(await fetchWithRelations(id))
}

// ── Delete (hard) ─────────────────────────────────────────────────────────────

export type DeleteProductResult = { deleted: true } | { deleted: false; reason: 'has_orders' }

export async function deleteAdminProduct(id: string): Promise<DeleteProductResult> {
  // Order history is shared with luma-manager and must never be destroyed —
  // a product that appears in any order can only be deactivated, not deleted.
  const orderCount = await prisma.orderItem.count({ where: { productId: id } })
  if (orderCount > 0) return { deleted: false, reason: 'has_orders' }

  const images = await prisma.productImage.findMany({
    where: { productId: id },
    select: { url: true },
  })

  await prisma.$transaction([
    prisma.review.deleteMany({ where: { productId: id } }),
    prisma.customPricingRule.deleteMany({ where: { productId: id } }),
    prisma.productImage.deleteMany({ where: { productId: id } }),
    prisma.productVariant.deleteMany({ where: { productId: id } }),
    prisma.product.delete({ where: { id } }),
  ])

  // Fire-and-forget storage cleanup, same as the update path
  for (const { url } of images) {
    deleteIfOrphaned(url).catch(console.error)
  }

  return { deleted: true }
}
