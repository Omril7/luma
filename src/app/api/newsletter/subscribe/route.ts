import { NextRequest, NextResponse } from 'next/server'
import { withApi, parseBody, checkRateLimit } from '@/server/http'
import { newsletterSubscribeSchema } from '@/shared/schemas'
import { subscribeToNewsletter } from '@/server/services/newsletterService'

export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 3, windowMs: 5 * 60 * 1000 })
  if (limited) return limited

  const body = await parseBody(req, newsletterSubscribeSchema)
  if (body instanceof NextResponse) return body

  await subscribeToNewsletter(body)

  return NextResponse.json({ success: true })
})
