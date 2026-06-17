import { getTranslations } from 'next-intl/server'
import { Header } from './Header'
import { Footer } from './Footer'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { A11yWidget } from '@/components/A11yWidget'
import { ToastContainer } from '@/components/ToastContainer'

export async function StorefrontLayout({
  children,
  locale,
}: {
  children: React.ReactNode
  locale: string
}) {
  const t = await getTranslations({ locale, namespace: 'header' })

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-surface"
      >
        {t('skipToMain')}
      </a>
      <Header />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer locale={locale} />
      <WhatsAppButton />
      <A11yWidget />
      <ToastContainer />
    </>
  )
}
