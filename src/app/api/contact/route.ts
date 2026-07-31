import { NextRequest, NextResponse } from 'next/server'
import { withApi, parseBody, checkRateLimit } from '@/server/http'
import { contactSchema } from '@/shared/schemas'
import { prisma } from '@/server/prisma'
import { subscribeToNewsletter } from '@/server/services/newsletterService'

export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 5, windowMs: 10 * 60 * 1000 })
  if (limited) return limited

  const body = await parseBody(req, contactSchema)
  if (body instanceof NextResponse) return body

  await prisma.contactMessage.create({
    data: {
      name: body.name,
      email: body.email,
      phone: body.phone,
      subject: body.subject,
      message: body.message,
      language: body.language ?? 'he',
      subscribedToNewsletter: body.subscribeToNewsletter ?? false,
    },
  })

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
