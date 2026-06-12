import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'
import { verify, type JwtPayload } from 'jsonwebtoken'

// ── Error envelope ────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

export function errorResponse(message: string, status: number, details?: unknown): NextResponse {
  const body: ApiError = { error: message }
  if (details !== undefined) body.details = details
  return NextResponse.json(body, { status })
}

export function zodErrorResponse(err: ZodError): NextResponse {
  return errorResponse('Validation failed', 422, err.flatten().fieldErrors)
}

// ── Zod validation helper ─────────────────────────────────────────────────────

export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<T | NextResponse> {
  try {
    const json = await req.json()
    const result = schema.safeParse(json)
    if (!result.success) return zodErrorResponse(result.error)
    return result.data
  } catch {
    return errorResponse('Invalid JSON body', 400)
  }
}

// ── JWT admin guard ───────────────────────────────────────────────────────────

export interface AdminPayload extends JwtPayload {
  adminId: string
  email: string
}

export function verifyAdminToken(req: NextRequest): AdminPayload | null {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null

  const token = auth.slice(7)
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) throw new Error('JWT_SECRET not configured')
    return verify(token, secret) as AdminPayload
  } catch {
    return null
  }
}

export function withAdmin(
  handler: (req: NextRequest, admin: AdminPayload) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const admin = verifyAdminToken(req)
    if (!admin) return errorResponse('Unauthorized', 401)
    return handler(req, admin)
  }
}
