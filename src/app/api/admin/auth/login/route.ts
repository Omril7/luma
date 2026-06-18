import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { sign } from 'jsonwebtoken'
import { z } from 'zod'
import { parseBody, errorResponse } from '@/server/http'
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

    const valid = await compare(body.password, admin.passwordHash)
    if (!valid) return errorResponse('Invalid credentials', 401)

    const secret = process.env.JWT_SECRET
    if (!secret) return errorResponse('Server misconfiguration', 500)

    const token = sign({ adminId: admin.id, email: admin.email }, secret, { expiresIn: '7d' })

    return NextResponse.json({ token, email: admin.email })
  } catch (err) {
    console.error('[admin/auth/login]', err)
    return errorResponse('Internal server error', 500)
  }
}
