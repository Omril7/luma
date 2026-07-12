import 'server-only'
import { prisma } from '@/server/prisma'
import type { CreateReviewInput } from '@/shared/schemas'
import type { PublicReviewDTO } from '@/shared/types'

export async function getApprovedReviewsForProduct(
  productId: string,
  { page = 1, limit = 10 }: { page?: number; limit?: number } = {}
): Promise<{ reviews: PublicReviewDTO[]; total: number; page: number; pages: number }> {
  const [reviews, total] = await prisma.$transaction([
    prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where: { productId, isApproved: true } }),
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
    select: { id: true },
  })
  if (!product) return null

  return prisma.review.create({
    data: {
      productId: input.productId,
      customerName: input.customerName,
      rating: input.rating,
      comment_he: input.comment_he,
      comment_en: input.comment_en,
      isApproved: false,
    },
  })
}
