import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { prisma } from '@/server/prisma'
import type { PriceOfferStatus } from '@prisma/client'

export const GET = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)))
  const skip = (page - 1) * pageSize

  const statusParam = searchParams.get('status')
  const status: PriceOfferStatus | undefined =
    statusParam === 'NEW' || statusParam === 'HANDLED' ? statusParam : undefined

  const where = {
    ...(status !== undefined ? { status } : {}),
  }

  const [requests, total] = await Promise.all([
    prisma.priceOfferRequest.findMany({
      where,
      include: { product: { select: { id: true, name_he: true, name_en: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.priceOfferRequest.count({ where }),
  ])

  const data = requests.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName_he: r.product.name_he,
    productName_en: r.product.name_en,
    productSlug: r.product.slug,
    customerName: r.customerName,
    phone: r.phone,
    email: r.email ?? undefined,
    message: r.message ?? undefined,
    variantName: r.variantName ?? undefined,
    isCustom: r.isCustom,
    customWidth: r.customWidth != null ? Number(r.customWidth) : undefined,
    customHeight: r.customHeight != null ? Number(r.customHeight) : undefined,
    customDepth: r.customDepth != null ? Number(r.customDepth) : undefined,
    colorName: r.colorName ?? undefined,
    quantity: r.quantity,
    quotedPrice: r.quotedPrice != null ? Number(r.quotedPrice) : undefined,
    language: r.language,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }))

  return NextResponse.json({ data, total, page, pageSize })
})
