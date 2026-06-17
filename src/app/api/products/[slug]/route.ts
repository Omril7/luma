import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from '@/server/http'
import { getProductBySlug } from '@/server/services/productService'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const product = await getProductBySlug(slug)
    if (!product) return errorResponse('Product not found', 404)
    return NextResponse.json(product)
  } catch (err) {
    console.error('[API error]', err)
    return errorResponse('Internal server error', 500)
  }
}
