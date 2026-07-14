import 'server-only'
import { type Language, Prisma } from '@prisma/client'
import { prisma } from '@/server/prisma'
import { getEmailProvider } from '@/server/providers/email'
import { getEmailSettings } from '@/server/services/adminEmailSettingsService'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SubscriberDTO {
  id: string
  email: string
  name?: string
  language: string
  subscribedAt: string
  isActive: boolean
}

export interface NewsletterSendDTO {
  id: string
  subject_he: string
  subject_en: string
  sentAt: string
  recipientCount: number
  targetLanguage?: string
}

export interface SendNewsletterInput {
  subject_he: string
  subject_en: string
  body_he: string
  body_en: string
  targetLanguage?: 'he' | 'en'
}

function toSubscriberDTO(s: {
  id: string
  email: string
  name: string | null
  language: Language
  subscribedAt: Date
  isActive: boolean
}): SubscriberDTO {
  return {
    id: s.id,
    email: s.email,
    name: s.name ?? undefined,
    language: s.language,
    subscribedAt: s.subscribedAt.toISOString(),
    isActive: s.isActive,
  }
}

function toSendDTO(s: {
  id: string
  subject_he: string
  subject_en: string
  sentAt: Date
  recipientCount: number
  targetLanguage: Language | null
}): NewsletterSendDTO {
  return {
    id: s.id,
    subject_he: s.subject_he,
    subject_en: s.subject_en,
    sentAt: s.sentAt.toISOString(),
    recipientCount: s.recipientCount,
    targetLanguage: s.targetLanguage ?? undefined,
  }
}

// ── List subscribers ──────────────────────────────────────────────────────────

export interface ListSubscribersOptions {
  page?: number
  pageSize?: number
  search?: string
  language?: 'he' | 'en'
  isActive?: boolean
}

export async function listSubscribers(opts: ListSubscribersOptions = {}) {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25))
  const skip = (page - 1) * pageSize

  const where: Prisma.NewsletterSubscriberWhereInput = {
    ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
    ...(opts.language ? { language: opts.language as Language } : {}),
    ...(opts.search ? { email: { contains: opts.search, mode: 'insensitive' as const } } : {}),
  }

  const [subscribers, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { subscribedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.newsletterSubscriber.count({ where }),
  ])

  return { data: subscribers.map(toSubscriberDTO), total, page, pageSize }
}

// ── Export CSV ────────────────────────────────────────────────────────────────

export async function exportSubscribersCSV(): Promise<string> {
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { subscribedAt: 'desc' },
  })

  const header = 'id,email,name,language,subscribedAt,isActive'
  const rows = subscribers.map((s) => {
    const name = s.name ? `"${s.name.replace(/"/g, '""')}"` : ''
    return `${s.id},${s.email},${name},${s.language},${s.subscribedAt.toISOString()},${s.isActive}`
  })

  return [header, ...rows].join('\n')
}

// ── Send newsletter ───────────────────────────────────────────────────────────

export async function sendNewsletter(input: SendNewsletterInput): Promise<{ sent: number }> {
  const where: Prisma.NewsletterSubscriberWhereInput = {
    isActive: true,
    ...(input.targetLanguage ? { language: input.targetLanguage as Language } : {}),
  }

  const subscribers = await prisma.newsletterSubscriber.findMany({ where })

  const emailProvider = await getEmailProvider()
  const settings = await getEmailSettings()

  let sent = 0
  for (const subscriber of subscribers) {
    const lang = subscriber.language
    const subject = lang === 'he' ? input.subject_he : input.subject_en
    const html = lang === 'he' ? input.body_he : input.body_en
    const fromName = lang === 'he' ? settings.fromName_he : settings.fromName_en

    try {
      await emailProvider.send({
        to: subscriber.email,
        subject,
        html,
        from: { address: settings.fromAddress, name: fromName },
        ...(settings.replyTo ? { replyTo: settings.replyTo } : {}),
      })
      sent++
    } catch (err) {
      console.error(`[newsletter] failed to send to ${subscriber.email}:`, err)
    }
  }

  // Persist send record
  await prisma.newsletterSend.create({
    data: {
      subject_he: input.subject_he,
      subject_en: input.subject_en,
      recipientCount: sent,
      targetLanguage: input.targetLanguage ? (input.targetLanguage as Language) : null,
    },
  })

  return { sent }
}

// ── Send history ──────────────────────────────────────────────────────────────

export async function listNewsletterSends(): Promise<NewsletterSendDTO[]> {
  const sends = await prisma.newsletterSend.findMany({ orderBy: { sentAt: 'desc' } })
  return sends.map(toSendDTO)
}
