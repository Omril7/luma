import type { Metadata } from 'next'
import dynamicImport from 'next/dynamic'
import { HeroSection, type HomeHeroContent } from '@/features/home/HeroSection'
// import { FeaturedSection } from '@/features/home/FeaturedSection'
import type { HomeStoryContent } from '@/features/home/StorySection'
import type { HomeContactContent } from '@/features/home/ContactSection'
import type { TestimonialItem } from '@/features/home/TestimonialsSection'

// Below-the-fold sections: still server-rendered, but their client JS is split
// into separate chunks so above-the-fold hydration isn't one long task.
const StorySection = dynamicImport(() =>
  import('@/features/home/StorySection').then((m) => m.StorySection)
)
const TestimonialsSection = dynamicImport(() =>
  import('@/features/home/TestimonialsSection').then((m) => m.TestimonialsSection)
)
const InstagramSection = dynamicImport(() =>
  import('@/features/home/InstagramSection').then((m) => m.InstagramSection)
)
const ContactSection = dynamicImport(() =>
  import('@/features/home/ContactSection').then((m) => m.ContactSection)
)
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import { getSiteSettings } from '@/server/services/adminSettingsService'
import { listActiveInstagramHighlights } from '@/server/services/adminInstagramService'
import { setRequestLocale } from 'next-intl/server'

export const revalidate = 300

const HOME_HERO_DEFAULTS: HomeHeroContent = {
  eyebrow_he: '',
  eyebrow_en: '',
  heading_he: '',
  heading_en: '',
  subheading_he: '',
  subheading_en: '',
}

const HOME_STORY_DEFAULTS: HomeStoryContent = {
  heading_he: '',
  heading_en: '',
  body1_he: '',
  body1_en: '',
  body2_he: '',
  body2_en: '',
  cta_he: '',
  cta_en: '',
  imageUrl: '',
}

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
  setRequestLocale(lang)

  const [row, heroRow, storyRow, contactRow, { business }, instagramHighlights] = await Promise.all(
    [
      getSiteContentByKey('home.testimonials'),
      getSiteContentByKey('home.hero'),
      getSiteContentByKey('home.story'),
      getSiteContentByKey('home.contact'),
      getSiteSettings(),
      listActiveInstagramHighlights(),
    ]
  )
  const testimonials = (row?.value as { items?: TestimonialItem[] } | undefined)?.items ?? []
  const heroContent: HomeHeroContent = {
    ...HOME_HERO_DEFAULTS,
    ...((heroRow?.value as Partial<HomeHeroContent>) ?? {}),
  }
  const storyContent: HomeStoryContent = {
    ...HOME_STORY_DEFAULTS,
    ...((storyRow?.value as Partial<HomeStoryContent>) ?? {}),
  }
  const contactContent: HomeContactContent = {
    ...HOME_CONTACT_DEFAULTS,
    ...((contactRow?.value as Partial<HomeContactContent>) ?? {}),
  }

  return (
    <>
      <HeroSection locale={lang} whatsappNumber={business.whatsappNumber} content={heroContent} />
      {/* <div className="bg-bg"><FeaturedSection products={...} locale={lang} /></div> — restore with getProducts({ featured: true, limit: 6 }) */}
      <div className="bg-bg">
        <StorySection locale={lang} content={storyContent} />
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
