import { NextRequest, NextResponse } from 'next/server'
import { withApi, checkRateLimit } from '@/server/http'
import { getStorageProvider } from '@/server/providers/storage'

// Public, unauthenticated image upload for customer reviews. The rate limit + size
// + MIME + magic-byte checks are all load-bearing here — there is no auth in front.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

/** Sniff the real image format from the leading bytes — don't trust `file.type`. */
function sniffImageType(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp'
  }
  return null
}

export const POST = withApi(async (req: NextRequest) => {
  const limited = checkRateLimit(req, { limit: 8, windowMs: 60 * 60 * 1000 })
  if (limited) return limited

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const sniffed = sniffImageType(buffer.subarray(0, 12))
  if (!sniffed || sniffed !== file.type) {
    return NextResponse.json({ error: 'File content is not a valid image' }, { status: 400 })
  }

  const storage = await getStorageProvider()
  const result = await storage.save({ buffer, mimetype: sniffed, originalName: file.name })

  return NextResponse.json({ url: result.url }, { status: 201 })
})
