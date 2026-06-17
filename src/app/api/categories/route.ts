import { NextResponse } from 'next/server'
import { withApi } from '@/server/http'
import { prisma } from '@/server/prisma'
import { CATEGORY_VALUES } from '@/shared/constants'

export const GET = withApi(async () => {
  const counts = await prisma.product.groupBy({
    by: ['category'],
    where: { isActive: true },
    _count: { id: true },
  })

  const countMap = Object.fromEntries(counts.map((c) => [c.category, c._count.id]))

  const categories = CATEGORY_VALUES.map((cat) => ({
    value: cat,
    count: countMap[cat] ?? 0,
  })).filter((c) => c.count > 0)

  return NextResponse.json(categories)
})
