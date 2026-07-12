import { getTranslations } from 'next-intl/server'
import { Header } from './Header'
import { Footer } from './Footer'
import { InfoBar } from './InfoBar'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { A11yWidget } from '@/components/A11yWidget'
import { ToastContainer } from '@/components/ToastContainer'
import { getSiteSettings } from '@/server/services/adminSettingsService'

export async function StorefrontLayout({
  children,
  locale,
}: {
  children: React.ReactNode
  locale: string
}) {
  const t = await getTranslations({ locale, namespace: 'header' })
  const { business } = await getSiteSettings()
  const hours = locale === 'he' ? business.hours_he : business.hours_en

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-surface"
      >
        {t('skipToMain')}
      </a>
      <InfoBar locale={locale} hours={hours} />
      <Header phone={business.phone || undefined} />
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <Footer
        instagramUrl={business.instagramUrl || undefined}
        facebookUrl={business.facebookUrl || undefined}
      />
      <WhatsAppButton whatsappNumber={business.whatsappNumber} />
      <A11yWidget />
      <ToastContainer />
    </>
  )
}
