import { NextRequest, NextResponse } from 'next/server'
import { withApi, parseBody, checkRateLimit } from '@/server/http'
import { contactSchema } from '@/shared/schemas'

export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 5, windowMs: 10 * 60 * 1000 })
  if (limited) return limited

  const body = await parseBody(req, contactSchema)
  if (body instanceof NextResponse) return body

  console.log('[contact]', body)

  return NextResponse.json({ success: true })
})
