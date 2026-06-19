import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { sendNewsletterSchema } from '@/shared/schemas'
import { sendNewsletter } from '@/server/services/adminNewsletterService'

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, sendNewsletterSchema)
  if (body instanceof NextResponse) return body

  const result = await sendNewsletter(body)
  return NextResponse.json(result, { status: 200 })
})
