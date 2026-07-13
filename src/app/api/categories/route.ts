import { NextResponse } from 'next/server'
import { withApi } from '@/server/http'
import { getCategoriesWithCounts } from '@/server/services/categoryService'

export const GET = withApi(async () => {
  const categories = await getCategoriesWithCounts()
  return NextResponse.json(categories)
})
