import { NextResponse } from 'next/server'
import { withApi } from '@/server/http'
import { prisma } from '@/server/prisma'

export const GET = withApi(async () => {
  const row = await prisma.siteContent.findUnique({ where: { key: 'faq' } })
  return NextResponse.json({ items: row?.value ?? [] })
})
