import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { getOrderById } from '@/server/services/orderService'
import { ConfirmationClient } from '@/features/checkout/ConfirmationClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'confirmation' })
  return { title: t('title') }
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>
}) {
  const { lang, id } = await params
  setRequestLocale(lang)
  const order = await getOrderById(id)
  return <ConfirmationClient order={order} locale={lang} />
}
