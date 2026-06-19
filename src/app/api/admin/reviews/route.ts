import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { prisma } from '@/server/prisma'

export const GET = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)))
  const skip = (page - 1) * pageSize

  const isApprovedParam = searchParams.get('isApproved')
  const isApproved = isApprovedParam === null ? undefined : isApprovedParam === 'true'

  const where = {
    ...(isApproved !== undefined ? { isApproved } : {}),
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

  const data = reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName_he: r.product.name_he,
    productName_en: r.product.name_en,
    productSlug: r.product.slug,
    customerName: r.customerName,
    rating: r.rating,
    comment_he: r.comment_he ?? undefined,
    comment_en: r.comment_en ?? undefined,
    isApproved: r.isApproved,
    createdAt: r.createdAt.toISOString(),
  }))

  return NextResponse.json({ data, total, page, pageSize })
})
