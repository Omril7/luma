import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { prisma } from '@/server/prisma'
import type { ContactMessageStatus } from '@prisma/client'

export const GET = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '25', 10)))
  const skip = (page - 1) * pageSize

  const statusParam = searchParams.get('status')
  const status: ContactMessageStatus | undefined =
    statusParam === 'NEW' || statusParam === 'READ' ? statusParam : undefined

  const where = {
    ...(status !== undefined ? { status } : {}),
  }

  const [messages, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.contactMessage.count({ where }),
  ])

  const data = messages.map((m) => ({
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone ?? undefined,
    subject: m.subject,
    message: m.message,
    language: m.language,
    subscribedToNewsletter: m.subscribedToNewsletter,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  }))

  return NextResponse.json({ data, total, page, pageSize })
})
