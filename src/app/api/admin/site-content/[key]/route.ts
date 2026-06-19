import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { siteContentValueSchema } from '@/shared/schemas'
import { getSiteContentByKey, upsertSiteContent } from '@/server/services/adminSiteContentService'

type Ctx = { params: Promise<{ key: string }> }

export const GET = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { key } = await params
  const item = await getSiteContentByKey(key)
  if (!item) return errorResponse('Site content not found', 404)
  return NextResponse.json({ item })
})

export const PUT = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { key } = await params

  const body = await parseBody(req, siteContentValueSchema)
  if (body instanceof NextResponse) return body

  const item = await upsertSiteContent(key, body.value)
  return NextResponse.json({ item })
})
