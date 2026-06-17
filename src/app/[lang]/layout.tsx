import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { routing } from '@/i18n/routing'
import { LangUpdater } from './_components/LangUpdater'

type Locale = (typeof routing.locales)[number]

export function generateStaticParams() {
  return routing.locales.map((lang) => ({ lang }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!routing.locales.includes(lang as Locale)) {
    notFound()
  }

  // Load messages directly from the URL segment — avoids middleware locale lag
  const messages =
    lang === 'en'
      ? (await import('@/i18n/en.json')).default
      : (await import('@/i18n/he.json')).default

  return (
    <NextIntlClientProvider locale={lang} messages={messages}>
      <LangUpdater lang={lang} />
      {children}
    </NextIntlClientProvider>
  )
}
