import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import { ContactClient } from '@/features/contact/ContactClient'

interface ContactInfo {
  phone: string
  whatsapp: string
  email: string
  address_he: string
  address_en: string
  hours_he: string
  hours_en: string
}

const DEFAULTS: ContactInfo = {
  phone: '',
  whatsapp: '',
  email: '',
  address_he: '',
  address_en: '',
  hours_he: '',
  hours_en: '',
}

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
  const row = await getSiteContentByKey('contact.info')
  const info: ContactInfo = {
    ...DEFAULTS,
    ...((row?.value as Partial<ContactInfo>) ?? {}),
  }

  return <ContactClient locale={lang} info={info} />
}
