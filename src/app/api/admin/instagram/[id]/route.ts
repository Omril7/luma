import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { updateInstagramHighlightSchema } from '@/shared/schemas'
import {
  updateInstagramHighlight,
  deleteInstagramHighlight,
} from '@/server/services/adminInstagramService'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const body = await parseBody(req, updateInstagramHighlightSchema)
  if (body instanceof NextResponse) return body

  const highlight = await updateInstagramHighlight(id, body)
  if (!highlight) return errorResponse('Instagram highlight not found', 404)
  return NextResponse.json({ highlight })
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const deleted = await deleteInstagramHighlight(id)
  if (!deleted) return errorResponse('Instagram highlight not found', 404)
  return NextResponse.json({ success: true })
})
