import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { getAllSiteContent } from '@/server/services/adminSiteContentService'

export const GET = withAdmin(async () => {
  const content = await getAllSiteContent()
  return NextResponse.json({ content })
})
