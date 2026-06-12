import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
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

  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      {/* Syncs <html lang dir> to the correct locale on the client */}
      <LangUpdater lang={lang} />
      {children}
    </NextIntlClientProvider>
  )
}
