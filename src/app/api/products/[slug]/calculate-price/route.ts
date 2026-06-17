import { NextRequest, NextResponse } from 'next/server'
import { parseBody, errorResponse, checkRateLimit } from '@/server/http'
import { getProductBySlug } from '@/server/services/productService'
import { calculateProductPrice } from '@/server/services/pricingService'
import { priceRequestSchema } from '@/shared/schemas'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const rateLimitError = checkRateLimit(req, { limit: 60, windowMs: 60_000 })
    if (rateLimitError) return rateLimitError

    const { slug } = await params

    const product = await getProductBySlug(slug)
    if (!product) return errorResponse('Product not found', 404)

    const body = await parseBody(req, priceRequestSchema.omit({ productId: true }))
    if (body instanceof NextResponse) return body

    const calc = await calculateProductPrice(product.id, body)

    if (calc.error) {
      if (calc.error.type === 'not_found') return errorResponse(calc.error.message, 404)
      if (calc.error.type === 'dimension_out_of_bounds') {
        return NextResponse.json(
          { error: calc.error.message, code: 'DIMENSION_OUT_OF_BOUNDS', details: calc.error },
          { status: 422 }
        )
      }
      return errorResponse(calc.error.message, 400)
    }

    return NextResponse.json(calc.result)
  } catch (err) {
    console.error('[API error]', err)
    return errorResponse('Internal server error', 500)
  }
}
