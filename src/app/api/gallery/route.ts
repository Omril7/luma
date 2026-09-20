import { NextResponse } from 'next/server'
import { withApi } from '@/server/http'
import { listGalleryImages } from '@/server/services/adminGalleryService'

export const GET = withApi(async () => {
  const items = await listGalleryImages({ activeOnly: true })
  return NextResponse.json({ items })
})
