import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Metadata } from 'next'
import { CartClient } from '@/features/cart/CartClient'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'cart' })
  return { title: t('title') }
}

export default async function CartPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  setRequestLocale(lang)
  return <CartClient locale={lang} />
}
