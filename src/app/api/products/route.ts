import { NextRequest, NextResponse } from 'next/server'
import { withApi } from '@/server/http'
import { getProducts, type ProductSortKey } from '@/server/services/productService'

export const GET = withApi(async (req: NextRequest) => {
  const { searchParams } = req.nextUrl

  const categoryId = searchParams.get('category') ?? undefined
  const featured = searchParams.has('featured')
    ? searchParams.get('featured') === 'true'
    : undefined
  const sort = (searchParams.get('sort') as ProductSortKey) || 'newest'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '12', 10)

  const validSorts: ProductSortKey[] = ['price_asc', 'price_desc', 'newest', 'name_he', 'name_en']
  if (!validSorts.includes(sort)) {
    return NextResponse.json({ error: 'Invalid sort' }, { status: 400 })
  }

  const data = await getProducts({ categoryId, featured, sort, page, limit })
  return NextResponse.json(data)
})
