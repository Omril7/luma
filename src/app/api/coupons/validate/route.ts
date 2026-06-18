import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseBody, errorResponse, checkRateLimit } from '@/server/http'
import { validateCoupon } from '@/server/services/orderService'

const schema = z.object({
  code: z.string().min(1).max(50),
  subtotal: z.number().positive(), // ₪ decimal
})

export async function POST(req: NextRequest) {
  try {
    const rl = checkRateLimit(req, { limit: 30, windowMs: 60_000 })
    if (rl) return rl

    const body = await parseBody(req, schema)
    if (body instanceof NextResponse) return body

    const result = await validateCoupon(body.code, body.subtotal)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 422 })

    return NextResponse.json(result.result)
  } catch (err) {
    console.error('[API error]', err)
    return errorResponse('Internal server error', 500)
  }
}
