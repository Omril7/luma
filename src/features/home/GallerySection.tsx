'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'
import { GalleryCarousel } from './GalleryCarousel'
import type { GalleryImageDTO } from '@/server/services/adminGalleryService'

interface GallerySectionProps {
  locale: string
  images: GalleryImageDTO[]
}

export function GallerySection({ locale, images }: GallerySectionProps) {
  const t = useTranslations('home.gallery')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  if (images.length === 0) return null

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          className="flex flex-wrap items-end justify-between gap-4 mb-10 md:mb-14"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-text-main">
            {t('heading')}
          </h2>
          <Link
            href="/gallery"
            className="text-primary font-semibold underline hover:text-primary-600 transition-colors duration-150"
          >
            {t('viewAll')}
          </Link>
        </motion.div>

        <GalleryCarousel images={images} locale={locale} />
      </div>
    </section>
  )
}
