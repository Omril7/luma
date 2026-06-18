import { NextRequest, NextResponse } from 'next/server'
import { withApi, errorResponse } from '@/server/http'
import { prisma } from '@/server/prisma'

type Ctx = { params: Promise<{ productId: string }> }

export const GET = withApi<Ctx>(async (req: NextRequest, { params }) => {
  const { productId } = await params
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)))

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true },
  })
  if (!product) return errorResponse('Product not found', 404)

  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: { productId, isApproved: true } }),
  ])

  return NextResponse.json({ reviews, total, page, pages: Math.ceil(total / limit) })
})
