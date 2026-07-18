import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { parseBody, errorResponse } from '@/server/http'
import { verifyPassword, signAdminToken } from '@/server/auth'
import { prisma } from '@/server/prisma'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = await parseBody(req, loginSchema)
    if (body instanceof NextResponse) return body

    const admin = await prisma.adminUser.findUnique({
      where: { email: body.email.toLowerCase() },
    })

    if (!admin) return errorResponse('Invalid credentials', 401)

    const valid = await verifyPassword(body.password, admin.passwordHash)
    if (!valid) return errorResponse('Invalid credentials', 401)

    const token = signAdminToken({ adminId: admin.id, email: admin.email })

    return NextResponse.json({ token, email: admin.email })
  } catch (err) {
    console.error('[admin/auth/login]', err)
    return errorResponse('Internal server error', 500)
  }
}
