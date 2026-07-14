import { NextResponse } from 'next/server'
import { withAdmin, errorResponse, parseBody, type AdminPayload } from '@/server/http'
import { prisma } from '@/server/prisma'
import { updateCategorySchema } from '@/shared/schemas'

type Ctx = { params: Promise<{ id: string }> }

export const PATCH = withAdmin<Ctx>(async (req, _admin: AdminPayload, { params }) => {
  const { id } = await params

  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing) return errorResponse('Category not found', 404)

  const body = await parseBody(req, updateCategorySchema)
  if (body instanceof NextResponse) return body

  const category = await prisma.category.update({ where: { id }, data: body })
  return NextResponse.json({ category })
})
