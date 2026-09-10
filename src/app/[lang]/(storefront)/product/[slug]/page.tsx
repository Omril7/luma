import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProductBySlug, getProducts } from '@/server/services/productService'
import { getApprovedReviewsForProduct } from '@/server/services/reviewService'
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import { ProductDetail } from '@/features/products/ProductDetail'
import { FEATURES } from '@/lib/featureFlags'
import { setRequestLocale } from 'next-intl/server'

interface FaqItem {
  q_he: string
  q_en: string
  a_he: string
  a_en: string
}

export const revalidate = 300

// Empty list = no slugs prebuilt, but marks the route static-capable so each
// product page is cached on first request (on-demand ISR, revalidated above).
export function generateStaticParams(): { slug: string }[] {
  return []
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>
}): Promise<Metadata> {
  const { lang, slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return {}

  const name = lang === 'he' ? product.name_he : product.name_en
  const desc = lang === 'he' ? product.description_he : product.description_en
  const image = product.images.find((img) => img.isPrimary)?.url ?? product.images[0]?.url

  return {
    title: `${name} — Luma`,
    description: desc,
    openGraph: image ? { images: [{ url: image }] } : undefined,
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>
}) {
  const { lang, slug } = await params
  setRequestLocale(lang)
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  // Related products (same category, exclude self) + reviews + site-wide FAQ, in parallel
  const [{ products: allRelated }, { reviews }, faqRow] = await Promise.all([
    getProducts({ categoryId: product.category.id, sort: 'recommended', limit: 5 }),
    getApprovedReviewsForProduct(product.id, { limit: 10 }),
    getSiteContentByKey('faq.items'),
  ])
  const relatedProducts = allRelated.filter((p) => p.id !== product.id).slice(0, 4)
  const faqValue = faqRow?.value as { items?: FaqItem[] } | undefined
  const faqItems = faqValue?.items ?? []

  return (
    <ProductDetail
      product={product}
      relatedProducts={relatedProducts}
      reviews={reviews}
      faqItems={faqItems}
      locale={lang}
      purchasingEnabled={FEATURES.shop}
    />
  )
}
