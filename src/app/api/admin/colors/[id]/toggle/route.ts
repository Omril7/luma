import { NextResponse } from 'next/server'
import { withAdmin, errorResponse, type AdminPayload } from '@/server/http'
import { prisma } from '@/server/prisma'

type Ctx = { params: Promise<{ id: string }> }

const toggle = withAdmin<Ctx>(async (_req, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.colorOption.findUnique({ where: { id } })
  if (!existing) return errorResponse('Color not found', 404)

  const color = await prisma.colorOption.update({
    where: { id },
    data: { isActive: !existing.isActive },
  })
  return NextResponse.json({ isActive: color.isActive })
})

export const PATCH = toggle
