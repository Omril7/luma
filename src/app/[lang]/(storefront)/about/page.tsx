import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import { AboutContent } from '@/features/about/AboutContent'

export const revalidate = 300

interface AboutPageContent {
  title_he: string
  title_en: string
  body_he: string
  body_en: string
  imageUrl: string
}

const DEFAULTS: AboutPageContent = {
  title_he: '',
  title_en: '',
  body_he: '',
  body_en: '',
  imageUrl: '',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'about' })
  return { title: `${t('title')} — Luma` }
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  setRequestLocale(lang)
  const row = await getSiteContentByKey('about.page')
  const content: AboutPageContent = {
    ...DEFAULTS,
    ...((row?.value as Partial<AboutPageContent>) ?? {}),
  }

  return <AboutContent locale={lang} content={content} />
}
