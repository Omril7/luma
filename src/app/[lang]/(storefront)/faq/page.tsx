import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import { FaqClient } from '@/features/faq/FaqClient'

export const revalidate = 300

interface FaqItem {
  q_he: string
  q_en: string
  a_he: string
  a_en: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'faq' })
  return { title: `${t('title')} — Luma` }
}

export default async function FaqPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  setRequestLocale(lang)
  const row = await getSiteContentByKey('faq.items')
  const value = row?.value as { items?: FaqItem[] } | undefined
  const items = value?.items ?? []

  return <FaqClient locale={lang} items={items} />
}
