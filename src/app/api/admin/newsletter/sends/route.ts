import { NextResponse } from 'next/server'
import { withAdmin } from '@/server/http'
import { listNewsletterSends } from '@/server/services/adminNewsletterService'

export const GET = withAdmin(async () => {
  const sends = await listNewsletterSends()
  return NextResponse.json({ sends })
})
