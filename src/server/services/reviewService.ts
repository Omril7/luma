import 'server-only'
import { prisma } from '@/server/prisma'
import { sendAdminNotification } from '@/server/services/adminNotifyService'
import { deleteIfOrphaned } from '@/server/services/cloudinaryCleanupService'
import { escapeHtml } from '@/server/lib/escapeHtml'
import type { CreateReviewInput, AdminCreateReviewInput } from '@/shared/schemas'
import type { PublicReviewDTO, HomeReviewDTO, ReviewDTO } from '@/shared/types'

// ── DTO mappers ──────────────────────────────────────────────────────────────

type ReviewWithProduct = {
  id: string
  productId: string | null
  customerName: string
  rating: number
  comment_he: string | null
  comment_en: string | null
  imageUrl: string | null
  status: 'NEW' | 'READ' | 'APPROVED' | 'REJECTED'
  featuredOnHome: boolean
  createdAt: Date
  product: { id: string; name_he: string; name_en: string; slug: string } | null
}

export function toReviewDTO(r: ReviewWithProduct): ReviewDTO {
  return {
    id: r.id,
    productId: r.productId,
    productName_he: r.product?.name_he ?? null,
    productName_en: r.product?.name_en ?? null,
    productSlug: r.product?.slug ?? null,
    customerName: r.customerName,
    rating: r.rating,
    comment_he: r.comment_he ?? undefined,
    comment_en: r.comment_en ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
    status: r.status,
    featuredOnHome: r.featuredOnHome,
    createdAt: r.createdAt.toISOString(),
  }
}

// ── Public reads ─────────────────────────────────────────────────────────────

export async function getApprovedReviewsForProduct(
  productId: string,
  { page = 1, limit = 10 }: { page?: number; limit?: number } = {}
): Promise<{ reviews: PublicReviewDTO[]; total: number; page: number; pages: number }> {
  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { productId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: { productId, status: 'APPROVED' } }),
  ])

  return {
    reviews: reviews.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      rating: r.rating,
      comment_he: r.comment_he ?? undefined,
      comment_en: r.comment_en ?? undefined,
      imageUrl: r.imageUrl ?? undefined,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  }
}

/** Approved reviews the admin flagged for the homepage, newest first. */
export async function getFeaturedHomeReviews(limit = 12): Promise<HomeReviewDTO[]> {
  const rows = await prisma.review.findMany({
    where: { status: 'APPROVED', featuredOnHome: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { product: { select: { name_he: true, name_en: true } } },
  })

  return rows.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    comment_he: r.comment_he ?? undefined,
    comment_en: r.comment_en ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
    productName_he: r.product?.name_he,
    productName_en: r.product?.name_en,
    createdAt: r.createdAt.toISOString(),
  }))
}

// ── Guards ───────────────────────────────────────────────────────────────────

/** A review must carry at least one of: he comment, en comment, image. */
function hasContent(input: {
  comment_he?: string
  comment_en?: string
  imageUrl?: string | null
}): boolean {
  return Boolean(input.comment_he?.trim() || input.comment_en?.trim() || input.imageUrl)
}

// ── Public write ─────────────────────────────────────────────────────────────

export type CreateReviewResult = { ok: true } | { ok: false; reason: 'product_not_found' | 'empty' }

export async function createReview(input: CreateReviewInput): Promise<CreateReviewResult> {
  if (!hasContent(input)) return { ok: false, reason: 'empty' }

  let productName: string | null = null
  if (input.productId) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true, name_he: true },
    })
    if (!product) return { ok: false, reason: 'product_not_found' }
    productName = product.name_he
  }

  await prisma.review.create({
    data: {
      productId: input.productId ?? null,
      customerName: input.customerName,
      rating: input.rating,
      comment_he: input.comment_he,
      comment_en: input.comment_en,
      imageUrl: input.imageUrl,
    },
  })

  // Best-effort admin notification — the review is already saved, so an email
  // failure must never fail the submission.
  try {
    await notifyAdminOfNewReview({
      productName: productName ?? 'ביקורת כללית על העסק',
      customerName: input.customerName,
      rating: input.rating,
      comment_he: input.comment_he,
      comment_en: input.comment_en,
    })
  } catch (err) {
    console.error('[review] admin notification failed:', err)
  }

  return { ok: true }
}

// ── Admin writes ─────────────────────────────────────────────────────────────

export type AdminCreateReviewResult =
  | { ok: true; review: ReviewDTO }
  | { ok: false; reason: 'product_not_found' | 'empty' }

export async function adminCreateReview(
  input: AdminCreateReviewInput
): Promise<AdminCreateReviewResult> {
  if (!hasContent(input)) return { ok: false, reason: 'empty' }

  if (input.productId) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      select: { id: true },
    })
    if (!product) return { ok: false, reason: 'product_not_found' }
  }

  const status = input.status ?? 'APPROVED'

  const created = await prisma.review.create({
    data: {
      productId: input.productId ?? null,
      customerName: input.customerName,
      rating: input.rating,
      comment_he: input.comment_he,
      comment_en: input.comment_en,
      imageUrl: input.imageUrl,
      status,
      // A hidden review can't be on the homepage.
      featuredOnHome: Boolean(input.featuredOnHome) && status === 'APPROVED',
    },
    include: { product: { select: { id: true, name_he: true, name_en: true, slug: true } } },
  })

  return { ok: true, review: toReviewDTO(created) }
}

export type UpdateReviewFields = {
  status?: 'NEW' | 'READ' | 'APPROVED' | 'REJECTED'
  comment_he?: string | null
  comment_en?: string | null
  rating?: number
  imageUrl?: string | null
  featuredOnHome?: boolean
}

export type UpdateReviewResult =
  | { ok: true; review: ReviewDTO }
  | { ok: false; reason: 'not_found' | 'feature_requires_approved' }

export async function updateReview(
  id: string,
  fields: UpdateReviewFields
): Promise<UpdateReviewResult> {
  const existing = await prisma.review.findUnique({ where: { id } })
  if (!existing) return { ok: false, reason: 'not_found' }

  const nextStatus = fields.status ?? existing.status

  // Explicitly flagging a non-approved review for the homepage is a hard error.
  if (fields.featuredOnHome === true && nextStatus !== 'APPROVED') {
    return { ok: false, reason: 'feature_requires_approved' }
  }

  // Effective flag: keep/set the request's intent, but a review that isn't approved
  // is never on the homepage (so de-approving silently un-features).
  const nextFeatured =
    (fields.featuredOnHome ?? existing.featuredOnHome) && nextStatus === 'APPROVED'

  const imageChanged = fields.imageUrl !== undefined && fields.imageUrl !== existing.imageUrl

  const updated = await prisma.review.update({
    where: { id },
    data: {
      ...(fields.status !== undefined && { status: fields.status }),
      ...(fields.comment_he !== undefined && { comment_he: fields.comment_he }),
      ...(fields.comment_en !== undefined && { comment_en: fields.comment_en }),
      ...(fields.rating !== undefined && { rating: fields.rating }),
      ...(fields.imageUrl !== undefined && { imageUrl: fields.imageUrl }),
      featuredOnHome: nextFeatured,
    },
    include: { product: { select: { id: true, name_he: true, name_en: true, slug: true } } },
  })

  if (imageChanged && existing.imageUrl) {
    await deleteIfOrphaned(existing.imageUrl)
  }

  return { ok: true, review: toReviewDTO(updated) }
}

export async function deleteReview(id: string): Promise<boolean> {
  const existing = await prisma.review.findUnique({ where: { id } })
  if (!existing) return false

  await prisma.review.delete({ where: { id } })
  if (existing.imageUrl) await deleteIfOrphaned(existing.imageUrl)
  return true
}

// ── Admin email notification ──────────────────────────────────────────────────

interface NotifyAdminParams {
  productName: string
  customerName: string
  rating: number
  comment_he?: string
  comment_en?: string
}

async function notifyAdminOfNewReview(params: NotifyAdminParams): Promise<void> {
  const rows: Array<[string, string]> = [
    ['מוצר', params.productName],
    ['לקוח/ה', params.customerName],
    ['דירוג', '★'.repeat(params.rating) + '☆'.repeat(5 - params.rating)],
  ]

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 12px">${escapeHtml(value)}</td></tr>`
    )
    .join('')

  const comment = params.comment_he || params.comment_en
  const commentBlock = comment
    ? `<p style="margin:16px 0 4px;font-weight:600">תגובה:</p><p style="margin:0;white-space:pre-wrap">${escapeHtml(comment)}</p>`
    : ''

  const html = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:560px">
      <h2 style="margin:0 0 12px">ביקורת חדשה ממתינה לאישור</h2>
      <table style="border-collapse:collapse;background:#faf7f2;border-radius:8px">${tableRows}</table>
      ${commentBlock}
      <p style="margin-top:20px;font-size:13px;color:#777">
        ניתן לצפות בכל הביקורות בעמוד "ביקורות" בממשק הניהול.
      </p>
    </div>`

  await sendAdminNotification({
    subject: `ביקורת חדשה ממתינה לאישור — ${params.productName} (${params.customerName})`,
    html,
  })
}
