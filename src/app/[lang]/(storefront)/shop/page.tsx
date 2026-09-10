import type { Metadata } from 'next'
import dynamicImport from 'next/dynamic'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getShopCatalogCached } from '@/server/services/productService'
import { getActiveCategoriesCached } from '@/server/services/categoryService'
import { ShopClient } from '@/features/shop/ShopClient'
import { getSiteSettings } from '@/server/services/adminSettingsService'
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import type { HomeContactContent } from '@/features/home/ContactSection'

// Static/ISR — /shop fetches the whole active catalog once and does all filtering,
// sorting and pagination on the client, so a filter click never touches the server.
export const revalidate = 300

// Below-the-fold, so its client JS is split into its own chunk (same pattern
// as the homepage) instead of growing the main /shop bundle.
const ContactSection = dynamicImport(() =>
  import('@/features/home/ContactSection').then((m) => m.ContactSection)
)

const HOME_CONTACT_DEFAULTS: HomeContactContent = {
  heading_he: '',
  heading_en: '',
  body_he: '',
  body_en: '',
  whatsapp_he: '',
  whatsapp_en: '',
  email_he: '',
  email_en: '',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'shop' })
  return { title: `${t('title')} — Luma` }
}

export default async function ShopPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  setRequestLocale(lang)

  const [products, categories, { business }, contactRow] = await Promise.all([
    getShopCatalogCached(),
    getActiveCategoriesCached(),
    getSiteSettings(),
    getSiteContentByKey('home.contact'),
  ])
  const contactContent: HomeContactContent = {
    ...HOME_CONTACT_DEFAULTS,
    ...((contactRow?.value as Partial<HomeContactContent>) ?? {}),
  }

  return (
    <>
      <ShopClient products={products} categories={categories} locale={lang} />
      <div className="bg-secondary">
        <ContactSection
          locale={lang}
          whatsappNumber={business.whatsappNumber}
          email={business.email}
          content={contactContent}
        />
      </div>
    </>
  )
}
