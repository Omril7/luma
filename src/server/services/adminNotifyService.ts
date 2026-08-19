import 'server-only'
import { getEmailProvider } from '@/server/providers/email'
import { getEmailSettings } from '@/server/services/adminEmailSettingsService'
import { getSiteSettings } from '@/server/services/adminSettingsService'

interface SendAdminNotificationParams {
  subject: string
  html: string
  replyTo?: string
}

/**
 * Shared "notify the business owner" sender used by every public submission flow
 * (contact form, price-offer request, review). Callers build their own subject/html
 * and are responsible for wrapping the call in a best-effort try/catch, since a failed
 * notification must never fail the visitor's submission.
 */
export async function sendAdminNotification({
  subject,
  html,
  replyTo,
}: SendAdminNotificationParams): Promise<void> {
  const [settings, site] = await Promise.all([getEmailSettings(), getSiteSettings()])

  // Dev-only override so local testing never depends on (or risks emailing) the real
  // business address — only read outside production, and only if explicitly set.
  const devOverride =
    process.env.NODE_ENV !== 'production' ? process.env.DEV_NOTIFICATION_EMAIL : undefined

  // Prefer the business contact email; fall back to reply-to, then from-address.
  const to = devOverride || site.business.email || settings.replyTo || settings.fromAddress
  if (!to) {
    console.warn('[admin-notify] no admin email configured — skipping notification')
    return
  }

  const provider = await getEmailProvider()
  await provider.send({
    to,
    subject,
    html,
    from: { address: settings.fromAddress, name: settings.fromName_he },
    ...(replyTo ? { replyTo } : {}),
  })
}
