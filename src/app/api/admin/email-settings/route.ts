import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody } from '@/server/http'
import { updateEmailSettingsSchema } from '@/shared/schemas'
import { getEmailSettings, upsertEmailSettings } from '@/server/services/adminEmailSettingsService'

export const GET = withAdmin(async () => {
  const settings = await getEmailSettings()
  return NextResponse.json({ settings })
})

export const PUT = withAdmin(async (req: NextRequest, _admin, _ctx) => {
  const body = await parseBody(req, updateEmailSettingsSchema)
  if (body instanceof NextResponse) return body

  const settings = await upsertEmailSettings(body)
  return NextResponse.json({ settings })
})
