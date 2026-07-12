import type { Metadata } from 'next'
import { HeroSection } from '@/features/home/HeroSection'
// import { FeaturedSection } from '@/features/home/FeaturedSection'
import { StorySection } from '@/features/home/StorySection'
import { TestimonialsSection, type TestimonialItem } from '@/features/home/TestimonialsSection'
import { InstagramSection } from '@/features/home/InstagramSection'
import { ContactSection } from '@/features/home/ContactSection'
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import { getSiteSettings } from '@/server/services/adminSettingsService'
import { listActiveInstagramHighlights } from '@/server/services/adminInstagramService'

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

  const row = await getSiteContentByKey('home.testimonials')
  const testimonials = (row?.value as { items?: TestimonialItem[] } | undefined)?.items ?? []
  const { business } = await getSiteSettings()
  const instagramHighlights = await listActiveInstagramHighlights()

  return (
    <>
      <HeroSection locale={lang} whatsappNumber={business.whatsappNumber} />
      {/* <div className="bg-bg"><FeaturedSection products={...} locale={lang} /></div> — restore with getProducts({ featured: true, limit: 6 }) */}
      <div className="bg-bg">
        <StorySection locale={lang} />
      </div>
      <div className="bg-secondary">
        <TestimonialsSection locale={lang} items={testimonials} />
      </div>
      <div className="bg-bg">
        <InstagramSection
          locale={lang}
          items={instagramHighlights}
          instagramUrl={business.instagramUrl || undefined}
        />
      </div>
      <div className="bg-secondary">
        <ContactSection whatsappNumber={business.whatsappNumber} email={business.email} />
      </div>
    </>
  )
}
