import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getProductBySlug, getProducts } from '@/server/services/productService'
import { getApprovedReviewsForProduct } from '@/server/services/reviewService'
import { ProductDetail } from '@/features/products/ProductDetail'
import { FEATURES } from '@/lib/featureFlags'

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
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  // Fetch up to 4 related products (same category, exclude self)
  const { products: allRelated } = await getProducts({
    categoryId: product.category.id,
    limit: 5,
  })
  const relatedProducts = allRelated.filter((p) => p.id !== product.id).slice(0, 4)

  const { reviews } = await getApprovedReviewsForProduct(product.id, { limit: 10 })

  return (
    <ProductDetail
      product={product}
      relatedProducts={relatedProducts}
      reviews={reviews}
      locale={lang}
      purchasingEnabled={FEATURES.shop}
    />
  )
}
