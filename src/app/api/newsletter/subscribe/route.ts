import { NextRequest, NextResponse } from 'next/server'
import { withApi, parseBody, checkRateLimit } from '@/server/http'
import { newsletterSubscribeSchema } from '@/shared/schemas'
import { prisma } from '@/server/prisma'

export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 3, windowMs: 5 * 60 * 1000 })
  if (limited) return limited

  const body = await parseBody(req, newsletterSubscribeSchema)
  if (body instanceof NextResponse) return body

  await prisma.newsletterSubscriber.upsert({
    where: { email: body.email },
    update: { isActive: true, language: body.language, ...(body.name && { name: body.name }) },
    create: { email: body.email, name: body.name, language: body.language, isActive: true },
  })

  return NextResponse.json({ success: true })
})
