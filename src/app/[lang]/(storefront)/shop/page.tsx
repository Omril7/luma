import type { Metadata } from 'next'
import dynamicImport from 'next/dynamic'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getProducts } from '@/server/services/productService'
import { getActiveCategories } from '@/server/services/categoryService'
import type { ProductSortKey } from '@/server/services/productService'
import { ShopClient } from '@/features/shop/ShopClient'
import { getSiteSettings } from '@/server/services/adminSettingsService'
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import type { HomeContactContent } from '@/features/home/ContactSection'

// Below-the-fold, so its client JS is split into its own chunk (same pattern
// as the homepage) instead of growing the main /shop bundle.
const ContactSection = dynamicImport(() =>
  import('@/features/home/ContactSection').then((m) => m.ContactSection)
)

const VALID_SORTS: ProductSortKey[] = ['newest', 'price_asc', 'price_desc', 'name_he', 'name_en']
const PAGE_SIZE = 12

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

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lang } = await params
  setRequestLocale(lang)
  const sp = await searchParams

  const categoryId = typeof sp.category === 'string' ? sp.category : undefined
  const sort =
    typeof sp.sort === 'string' && VALID_SORTS.includes(sp.sort as ProductSortKey)
      ? (sp.sort as ProductSortKey)
      : 'newest'
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1

  const [{ products, total, totalPages }, categories, { business }, contactRow] = await Promise.all(
    [
      getProducts({ categoryId, sort, page, limit: PAGE_SIZE }),
      getActiveCategories(),
      getSiteSettings(),
      getSiteContentByKey('home.contact'),
    ]
  )
  const contactContent: HomeContactContent = {
    ...HOME_CONTACT_DEFAULTS,
    ...((contactRow?.value as Partial<HomeContactContent>) ?? {}),
  }

  return (
    <>
      <ShopClient
        initialProducts={products}
        total={total}
        totalPages={totalPages}
        currentPage={page}
        currentCategory={categoryId}
        currentSort={sort}
        categories={categories}
        locale={lang}
      />
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
