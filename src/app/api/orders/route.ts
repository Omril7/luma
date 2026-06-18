import { NextRequest, NextResponse } from 'next/server'
import { parseBody, errorResponse, checkRateLimit } from '@/server/http'
import { createOrderSchema } from '@/shared/schemas'
import { createOrder } from '@/server/services/orderService'

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { limit: 10, windowMs: 60_000 })
    if (rl) return rl

    const body = await parseBody(req, createOrderSchema)
    if (body instanceof NextResponse) return body

    const order = await createOrder({
      ...body,
      language: body.language ?? 'he',
      shippingAddress: {
        ...body.shippingAddress,
        country: body.shippingAddress.country ?? 'Israel',
      },
    })
    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    console.error('[API error]', err)
    return errorResponse('Internal server error', 500)
  }
}
