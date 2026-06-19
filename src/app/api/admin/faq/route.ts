import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { createFaqItemSchema } from '@/shared/schemas'
import { listFaqItems, createFaqItem } from '@/server/services/adminFaqService'

export const GET = withAdmin(async () => {
  const items = await listFaqItems()
  return NextResponse.json({ items })
})

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, createFaqItemSchema)
  if (body instanceof NextResponse) return body

  const item = await createFaqItem(body)
  return NextResponse.json({ item }, { status: 201 })
})
