import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { updateFaqItemSchema } from '@/shared/schemas'
import { updateFaqItem, deleteFaqItem } from '@/server/services/adminFaqService'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const body = await parseBody(req, updateFaqItemSchema)
  if (body instanceof NextResponse) return body

  const item = await updateFaqItem(id, body)
  if (!item) return errorResponse('FAQ item not found', 404)
  return NextResponse.json({ item })
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const deleted = await deleteFaqItem(id)
  if (!deleted) return errorResponse('FAQ item not found', 404)
  return NextResponse.json({ success: true })
})
