import 'server-only'
import { prisma } from '@/server/prisma'
import type { CategoryDTO } from '@/shared/types'

/** All active categories, for filter UIs that should always list every category. */
export async function getActiveCategories(): Promise<CategoryDTO[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name_he: true, name_en: true },
  })
  return categories
}

export interface CategoryWithCount extends CategoryDTO {
  count: number
}

/** Active categories that have at least one active product, with product counts. */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      name_he: true,
      name_en: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  })
  return categories
    .map((c) => ({ id: c.id, name_he: c.name_he, name_en: c.name_en, count: c._count.products }))
    .filter((c) => c.count > 0)
}
