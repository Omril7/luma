import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { getStorageProvider } from '@/server/providers/storage'

export const POST = withAdmin(async () => {
  const storage = await getStorageProvider()
  return NextResponse.json(await storage.createUploadTicket())
})
