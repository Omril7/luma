import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { updateReviewSchema } from '@/shared/schemas'
import { updateReview, deleteReview } from '@/server/services/reviewService'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const body = await parseBody(req, updateReviewSchema)
  if (body instanceof NextResponse) return body

  const result = await updateReview(id, body)
  if (!result.ok) {
    if (result.reason === 'not_found') return errorResponse('Review not found', 404)
    return errorResponse('Only an approved review can be featured on the homepage', 422)
  }

  return NextResponse.json({ review: result.review })
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const deleted = await deleteReview(id)
  if (!deleted) return errorResponse('Review not found', 404)

  return NextResponse.json({ success: true })
})
