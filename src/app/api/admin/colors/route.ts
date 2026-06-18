import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { prisma } from '@/server/prisma'
import { z } from 'zod'
import { parseBody } from '@/server/http'

const createColorSchema = z.object({
  name_he: z.string().min(1).max(100),
  name_en: z.string().min(1).max(100),
  hexCode: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  imageUrl: z.string().url().optional(),
})

export const GET = withAdmin(async () => {
  const colors = await prisma.colorOption.findMany({
    orderBy: { name_he: 'asc' },
  })
  return NextResponse.json({ colors })
})

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, createColorSchema)
  if (body instanceof NextResponse) return body

  const color = await prisma.colorOption.create({ data: body })
  return NextResponse.json({ color }, { status: 201 })
})
