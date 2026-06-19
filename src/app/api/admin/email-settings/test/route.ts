import { NextRequest, NextResponse } from 'next/server'
import { withAdmin, parseBody, type AdminPayload } from '@/server/http'
import { testEmailSchema } from '@/shared/schemas'
import { getEmailProvider } from '@/server/providers/email'
import { getEmailSettings } from '@/server/services/adminEmailSettingsService'

export const POST = withAdmin(async (req: NextRequest, admin: AdminPayload, _ctx) => {
  const body = await parseBody(req, testEmailSchema)
  if (body instanceof NextResponse) return body

  const settings = await getEmailSettings()
  const emailProvider = await getEmailProvider()

  await emailProvider.send({
    to: body.to,
    subject: `Test email from Luma / ${settings.fromName_en}`,
    html: `
      <p>This is a test email sent from the Luma admin panel.</p>
      <p>If you received this, your email configuration is working correctly.</p>
      <p>Sent by: ${admin.email}</p>
    `,
  })

  return NextResponse.json({ success: true, sentTo: body.to })
})
