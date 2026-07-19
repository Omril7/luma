import { setRequestLocale } from 'next-intl/server'
import { StorefrontLayout } from '@/components/layouts/StorefrontLayout'

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  setRequestLocale(lang)
  return <StorefrontLayout locale={lang}>{children}</StorefrontLayout>
}
