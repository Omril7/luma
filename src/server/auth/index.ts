import 'server-only'
import { sign } from 'jsonwebtoken'
import { compare, hash } from 'bcryptjs'

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 12)
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed)
}

export function signAdminToken(payload: { adminId: string; email: string }): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET not configured')
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '2h'
  return sign(payload, secret, { expiresIn } as Parameters<typeof sign>[2])
}
