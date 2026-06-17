import type { Metadata } from 'next'
import { getProducts } from '@/server/services/productService'
import { HeroSection } from '@/features/home/HeroSection'
import { FeaturedSection } from '@/features/home/FeaturedSection'
import { StorySection } from '@/features/home/StorySection'
import { TestimonialsSection } from '@/features/home/TestimonialsSection'
import { InstagramSection } from '@/features/home/InstagramSection'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  return {
    title: lang === 'he' ? 'לומה — ריהוט בהזמנה אישית' : 'Luma — Custom Furniture',
    description:
      lang === 'he'
        ? 'ריהוט בהזמנה אישית, עשוי ביד. שולחנות, מדפים, שידות ועוד.'
        : 'Handmade custom furniture. Tables, shelves, nightstands and more.',
  }
}

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  const { products } = await getProducts({ featured: true, limit: 6 })

  return (
    <>
      <HeroSection locale={lang} />
      <FeaturedSection products={products} locale={lang} />
      <StorySection locale={lang} />
      <TestimonialsSection locale={lang} />
      <InstagramSection locale={lang} />
    </>
  )
}
