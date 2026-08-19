import 'server-only'
import { prisma } from '@/server/prisma'
import { sendAdminNotification } from '@/server/services/adminNotifyService'
import { escapeHtml } from '@/server/lib/escapeHtml'
import type { CreateReviewInput } from '@/shared/schemas'
import type { PublicReviewDTO } from '@/shared/types'

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
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  }
}

export async function createReview(input: CreateReviewInput) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, name_he: true, name_en: true },
  })
  if (!product) return null

  const created = await prisma.review.create({
    data: {
      productId: input.productId,
      customerName: input.customerName,
      rating: input.rating,
      comment_he: input.comment_he,
      comment_en: input.comment_en,
    },
  })

  // Best-effort admin notification — the review is already saved, so an email
  // failure must never fail the submission.
  try {
    await notifyAdminOfNewReview({
      productName: product.name_he,
      customerName: input.customerName,
      rating: input.rating,
      comment_he: input.comment_he,
      comment_en: input.comment_en,
    })
  } catch (err) {
    console.error('[review] admin notification failed:', err)
  }

  return created
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
