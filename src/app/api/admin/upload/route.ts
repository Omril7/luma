import { NextRequest, NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { getStorageProvider } from '@/server/providers/storage'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export const POST = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const formData = await req.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5 MB)' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const storage = await getStorageProvider()
  const result = await storage.save({ buffer, mimetype: file.type, originalName: file.name })

  return NextResponse.json({ url: result.url, key: result.key })
})
