import { NextRequest, NextResponse } from 'next/server'
import { withApi, checkRateLimit } from '@/server/http'
import { getStorageProvider } from '@/server/providers/storage'

// Public, unauthenticated ticket issuer for customer review images. The rate limit
// is load-bearing here — there is no auth in front. Size/format/dimension caps live
// in the Cloudinary preset since the bytes never touch this server.
export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 8, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  const storage = await getStorageProvider()
  return NextResponse.json(await storage.createUploadTicket())
})
