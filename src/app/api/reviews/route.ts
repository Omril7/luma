import { NextRequest, NextResponse } from 'next/server'
import { withApi, parseBody, checkRateLimit, errorResponse } from '@/server/http'
import { createReviewSchema } from '@/shared/schemas'
import { createReview } from '@/server/services/reviewService'

export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 5, windowMs: 15 * 60 * 1000 })
  if (limited) return limited

  const body = await parseBody(req, createReviewSchema)
  if (body instanceof NextResponse) return body

  const review = await createReview(body)
  if (!review) return errorResponse('Product not found', 404)

  return NextResponse.json({ success: true }, { status: 201 })
})
