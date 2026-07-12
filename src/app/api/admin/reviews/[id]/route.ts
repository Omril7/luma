import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { updateReviewSchema } from '@/shared/schemas'
import { prisma } from '@/server/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.review.findUnique({ where: { id } })
  if (!existing) return errorResponse('Review not found', 404)

  const body = await parseBody(req, updateReviewSchema)
  if (body instanceof NextResponse) return body

  const review = await prisma.review.update({
    where: { id },
    data: { isApproved: body.isApproved },
    include: { product: { select: { id: true, name_he: true, name_en: true, slug: true } } },
  })

  return NextResponse.json({
    review: {
      id: review.id,
      productId: review.productId,
      productName_he: review.product.name_he,
      productName_en: review.product.name_en,
      productSlug: review.product.slug,
      customerName: review.customerName,
      rating: review.rating,
      comment_he: review.comment_he ?? undefined,
      comment_en: review.comment_en ?? undefined,
      isApproved: review.isApproved,
      createdAt: review.createdAt.toISOString(),
    },
  })
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.review.findUnique({ where: { id } })
  if (!existing) return errorResponse('Review not found', 404)

  await prisma.review.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
