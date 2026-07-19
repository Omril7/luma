import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { updatePriceOfferSchema } from '@/shared/schemas'
import { prisma } from '@/server/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.priceOfferRequest.findUnique({ where: { id } })
  if (!existing) return errorResponse('Price offer request not found', 404)

  const body = await parseBody(req, updatePriceOfferSchema)
  if (body instanceof NextResponse) return body

  const updated = await prisma.priceOfferRequest.update({
    where: { id },
    data: { status: body.status },
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.priceOfferRequest.findUnique({ where: { id } })
  if (!existing) return errorResponse('Price offer request not found', 404)

  await prisma.priceOfferRequest.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
