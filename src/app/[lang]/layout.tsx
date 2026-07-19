import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
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

  // Enable static rendering / ISR — without this, next-intl reads the locale from
  // request headers and silently opts every page into per-request rendering.
  setRequestLocale(lang)

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
