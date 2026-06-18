import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { CheckoutClient } from '@/features/checkout/CheckoutClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'checkout' })
  return { title: t('title') }
}

export default async function CheckoutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <CheckoutClient locale={lang} />
}
