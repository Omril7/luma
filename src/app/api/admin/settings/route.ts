import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { updateSettingsSchema } from '@/shared/schemas'
import { getSiteSettings, upsertSiteSettings } from '@/server/services/adminSettingsService'

export const GET = withAdmin(async () => {
  const settings = await getSiteSettings()
  return NextResponse.json({ settings })
})

export const PUT = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, updateSettingsSchema)
  if (body instanceof NextResponse) return body

  const settings = await upsertSiteSettings(body)
  return NextResponse.json({ settings })
})
