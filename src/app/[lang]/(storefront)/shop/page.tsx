import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getProducts } from '@/server/services/productService'
import { getActiveCategories } from '@/server/services/categoryService'
import type { ProductSortKey } from '@/server/services/productService'
import { ShopClient } from '@/features/shop/ShopClient'

const VALID_SORTS: ProductSortKey[] = ['newest', 'price_asc', 'price_desc', 'name_he', 'name_en']
const PAGE_SIZE = 12

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'shop' })
  return { title: `${t('title')} — Luma` }
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lang } = await params
  setRequestLocale(lang)
  const sp = await searchParams

  const categoryId = typeof sp.category === 'string' ? sp.category : undefined
  const sort =
    typeof sp.sort === 'string' && VALID_SORTS.includes(sp.sort as ProductSortKey)
      ? (sp.sort as ProductSortKey)
      : 'newest'
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1

  const [{ products, total, totalPages }, categories] = await Promise.all([
    getProducts({ categoryId, sort, page, limit: PAGE_SIZE }),
    getActiveCategories(),
  ])

  return (
    <ShopClient
      initialProducts={products}
      total={total}
      totalPages={totalPages}
      currentPage={page}
      currentCategory={categoryId}
      currentSort={sort}
      categories={categories}
      locale={lang}
    />
  )
}
