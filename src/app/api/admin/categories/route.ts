import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { prisma } from '@/server/prisma'
import { parseBody } from '@/server/http'
import { createCategorySchema } from '@/shared/schemas'

export const GET = withAdmin(async () => {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  return NextResponse.json({ categories })
})

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, createCategorySchema)
  if (body instanceof NextResponse) return body

  const category = await prisma.category.create({ data: body })
  return NextResponse.json({ category }, { status: 201 })
})
