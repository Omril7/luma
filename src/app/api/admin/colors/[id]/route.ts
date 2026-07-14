import { NextResponse } from 'next/server'
import { withAdmin, errorResponse, parseBody, type AdminPayload } from '@/server/http'
import { prisma } from '@/server/prisma'
import { updateColorSchema } from '@/shared/schemas'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.colorOption.findUnique({ where: { id } })
  if (!existing) return errorResponse('Color not found', 404)

  const body = await parseBody(req, updateColorSchema)
  if (body instanceof NextResponse) return body

  const color = await prisma.colorOption.update({ where: { id }, data: body })
  return NextResponse.json({ color })
})
