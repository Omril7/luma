import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getSiteSettings } from '@/server/services/adminSettingsService'
import { ContactClient } from '@/features/contact/ContactClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'contact' })
  return { title: `${t('title')} — Luma` }
}

export default async function ContactPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const { business } = await getSiteSettings()
  const info = {
    phone: business.phone,
    whatsapp: business.whatsappNumber,
    email: business.email,
    address_he: business.address_he,
    address_en: business.address_en,
    hours_he: business.hours_he,
    hours_en: business.hours_en,
  }

  return <ContactClient locale={lang} info={info} />
}
