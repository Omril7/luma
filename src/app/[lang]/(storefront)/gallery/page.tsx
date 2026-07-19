import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getSiteContentByKey } from '@/server/services/adminSiteContentService'
import { listGalleryImages } from '@/server/services/adminGalleryService'
import { GalleryClient } from '@/features/gallery/GalleryClient'

export const revalidate = 300

interface GalleryIntro {
  title_he: string
  title_en: string
  subtitle_he: string
  subtitle_en: string
}

const DEFAULTS: GalleryIntro = {
  title_he: '',
  title_en: '',
  subtitle_he: '',
  subtitle_en: '',
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const t = await getTranslations({ locale: lang, namespace: 'gallery' })
  return { title: `${t('title')} — Luma` }
}

export default async function GalleryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  setRequestLocale(lang)
  const [row, images] = await Promise.all([
    getSiteContentByKey('gallery.intro'),
    listGalleryImages(),
  ])
  const intro: GalleryIntro = {
    ...DEFAULTS,
    ...((row?.value as Partial<GalleryIntro>) ?? {}),
  }

  return <GalleryClient locale={lang} intro={intro} images={images} />
}
