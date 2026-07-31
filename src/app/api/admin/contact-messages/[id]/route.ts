import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, errorResponse, type AdminPayload } from '@/server/http'
import { updateContactMessageSchema } from '@/shared/schemas'
import { prisma } from '@/server/prisma'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req: NextRequest, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.contactMessage.findUnique({ where: { id } })
  if (!existing) return errorResponse('Contact message not found', 404)

  const body = await parseBody(req, updateContactMessageSchema)
  if (body instanceof NextResponse) return body

  const updated = await prisma.contactMessage.update({
    where: { id },
    data: { status: body.status },
  })

  return NextResponse.json({ id: updated.id, status: updated.status })
})

export const DELETE = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.contactMessage.findUnique({ where: { id } })
  if (!existing) return errorResponse('Contact message not found', 404)

  await prisma.contactMessage.delete({ where: { id } })
  return NextResponse.json({ success: true })
})
