import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { updateGalleryImageSchema } from '@/shared/schemas'
import { updateGalleryImage, deleteGalleryImage } from '@/server/services/adminGalleryService'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const body = await parseBody(req, updateGalleryImageSchema)
  if (body instanceof NextResponse) return body

  const image = await updateGalleryImage(id, body)
  if (!image) return errorResponse('Gallery image not found', 404)
  return NextResponse.json({ image })
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params
  const deleted = await deleteGalleryImage(id)
  if (!deleted) return errorResponse('Gallery image not found', 404)
  return NextResponse.json({ success: true })
})
