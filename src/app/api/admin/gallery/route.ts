import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { createGalleryImageSchema } from '@/shared/schemas'
import { listGalleryImages, createGalleryImage } from '@/server/services/adminGalleryService'

export const GET = withAdmin(async () => {
  const images = await listGalleryImages()
  return NextResponse.json({ images })
})

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, createGalleryImageSchema)
  if (body instanceof NextResponse) return body

  const image = await createGalleryImage(body)
  return NextResponse.json({ image }, { status: 201 })
})
