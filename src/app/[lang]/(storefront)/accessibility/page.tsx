import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getSiteSettings } from '@/server/services/adminSettingsService'
import { LegalPageContent } from '@/features/legal/LegalPageContent'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'accessibility' })
  return { title: `${t('title')} — Luma` }
}

export default async function AccessibilityPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  setRequestLocale(lang)
  const [t, { business }] = await Promise.all([
    getTranslations({ locale: lang, namespace: 'accessibility' }),
    getSiteSettings(),
  ])

  return (
    <LegalPageContent
      title={t('title')}
      updated={t('updated')}
      intro={t('intro')}
      sections={t.raw('sections')}
      contactEmail={business.email || undefined}
      contactLabel={t('contactLabel')}
    />
  )
}
