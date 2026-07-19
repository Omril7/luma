import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { WishlistClient } from '@/features/wishlist/WishlistClient'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'wishlist' })
  return { title: `${t('title')} — Luma` }
}

export default async function WishlistPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  return <WishlistClient locale={lang} />
}
