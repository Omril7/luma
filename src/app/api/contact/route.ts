import { NextRequest, NextResponse } from 'next/server'
import { withApi, parseBody, checkRateLimit } from '@/server/http'
import { contactSchema } from '@/shared/schemas'
import { subscribeToNewsletter } from '@/server/services/newsletterService'

export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 5, windowMs: 10 * 60 * 1000 })
  if (limited) return limited

  const body = await parseBody(req, contactSchema)
  if (body instanceof NextResponse) return body

  console.log('[contact]', body)

  if (body.subscribeToNewsletter) {
    try {
      await subscribeToNewsletter({
        email: body.email,
        name: body.name,
        language: body.language ?? 'he',
      })
    } catch (err) {
      // Best-effort: never fail the contact submission because of the newsletter opt-in.
      console.error('[contact] newsletter subscribe failed:', err)
    }
  }

  return NextResponse.json({ success: true })
})
