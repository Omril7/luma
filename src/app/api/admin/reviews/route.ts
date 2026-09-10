import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse } from '@/server/http'
import { prisma } from '@/server/prisma'
import { adminCreateReviewSchema } from '@/shared/schemas'
import { adminCreateReview, toReviewDTO } from '@/server/services/reviewService'
import type { Prisma, ReviewStatus } from '@prisma/client'

export const GET = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)))
  const skip = (page - 1) * pageSize

  const statusParam = searchParams.get('status')
  const status: ReviewStatus | undefined =
    statusParam === 'NEW' ||
    statusParam === 'READ' ||
    statusParam === 'APPROVED' ||
    statusParam === 'REJECTED'
      ? statusParam
      : undefined

  const scope = searchParams.get('scope') // 'global' | 'product'

  const where: Prisma.ReviewWhereInput = {
    ...(status !== undefined ? { status } : {}),
    ...(scope === 'global' ? { productId: null } : {}),
    ...(scope === 'product' ? { productId: { not: null } } : {}),
  }

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { product: { select: { id: true, name_he: true, name_en: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ])

  return NextResponse.json({ data: reviews.map(toReviewDTO), total, page, pageSize })
})

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, adminCreateReviewSchema)
  if (body instanceof NextResponse) return body

  const result = await adminCreateReview(body)
  if (!result.ok) {
    if (result.reason === 'product_not_found') return errorResponse('Product not found', 404)
    return errorResponse('A review needs a comment or an image', 422)
  }

  return NextResponse.json({ review: result.review }, { status: 201 })
})
