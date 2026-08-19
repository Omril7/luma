import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { prisma } from '@/server/prisma'

export const GET = withAdmin(async () => {
  const count = await prisma.priceOfferRequest.count({ where: { status: 'NEW' } })
  return NextResponse.json({ count })
})
