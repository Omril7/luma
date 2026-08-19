import 'server-only'
import { prisma } from '@/server/prisma'
import { sendAdminNotification } from '@/server/services/adminNotifyService'
import { escapeHtml } from '@/server/lib/escapeHtml'
import type { ContactInput } from '@/shared/schemas'

// ── Create (public) ───────────────────────────────────────────────────────────

export async function createContactMessage(
  input: Omit<ContactInput, 'language'> & { language?: ContactInput['language'] }
) {
  const created = await prisma.contactMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      language: input.language ?? 'he',
      subscribedToNewsletter: input.subscribeToNewsletter ?? false,
    },
  })

  // Best-effort admin notification — the message is already saved, so an email
  // failure must never fail the submission.
  try {
    await notifyAdminOfNewContactMessage({
      name: input.name,
      email: input.email,
      phone: input.phone,
      subject: input.subject,
      message: input.message,
      subscribedToNewsletter: input.subscribeToNewsletter ?? false,
    })
  } catch (err) {
    console.error('[contact] admin notification failed:', err)
  }

  return created
}

// ── Admin email notification ──────────────────────────────────────────────────

interface NotifyAdminParams {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  subscribedToNewsletter: boolean
}

async function notifyAdminOfNewContactMessage(params: NotifyAdminParams): Promise<void> {
  const rows: Array<[string, string]> = [
    ['שם', params.name],
    ['אימייל', params.email],
    ...(params.phone ? ([['טלפון', params.phone]] as Array<[string, string]>) : []),
    ['נושא', params.subject],
    ...(params.subscribedToNewsletter ? ([['ניוזלטר', 'נרשם/ה']] as Array<[string, string]>) : []),
  ]

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px;font-weight:600;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 12px">${escapeHtml(value)}</td></tr>`
    )
    .join('')

  const html = `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;color:#333;max-width:560px">
      <h2 style="margin:0 0 12px">הודעה חדשה מטופס יצירת קשר</h2>
      <table style="border-collapse:collapse;background:#faf7f2;border-radius:8px">${tableRows}</table>
      <p style="margin:16px 0 4px;font-weight:600">הודעה:</p>
      <p style="margin:0;white-space:pre-wrap">${escapeHtml(params.message)}</p>
      <p style="margin-top:20px;font-size:13px;color:#777">
        ניתן לצפות בכל ההודעות בעמוד "יצירת קשר" בממשק הניהול.
      </p>
    </div>`

  await sendAdminNotification({
    subject: `הודעה חדשה מטופס יצירת קשר — ${params.subject} (${params.name})`,
    html,
    replyTo: params.email,
  })
}
