import { NextRequest, NextResponse } from 'next/server'
import { withApi, parseBody, checkRateLimit, errorResponse } from '@/server/http'
import { createPriceOfferSchema } from '@/shared/schemas'
import { createPriceOfferRequest } from '@/server/services/priceOfferService'

export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 5, windowMs: 10 * 60 * 1000 })
  if (limited) return limited

  const body = await parseBody(req, createPriceOfferSchema)
  if (body instanceof NextResponse) return body

  const result = await createPriceOfferRequest(body)
  if (!result) return errorResponse('Product not found', 404)

  return NextResponse.json({ success: true, id: result.id }, { status: 201 })
})
