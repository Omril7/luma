import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { createInstagramHighlightSchema } from '@/shared/schemas'
import {
  listInstagramHighlights,
  createInstagramHighlight,
} from '@/server/services/adminInstagramService'

export const GET = withAdmin(async () => {
  const highlights = await listInstagramHighlights()
  return NextResponse.json({ highlights })
})

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, createInstagramHighlightSchema)
  if (body instanceof NextResponse) return body

  const highlight = await createInstagramHighlight(body)
  return NextResponse.json({ highlight }, { status: 201 })
})
