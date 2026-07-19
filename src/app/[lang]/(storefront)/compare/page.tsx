import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CompareClient } from '@/features/compare/CompareClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'compare' })
  return { title: `${t('title')} — Luma` }
}

export default async function ComparePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <CompareClient locale={lang} />
}
