'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'

export interface HomeStoryContent {
  heading_he: string
  heading_en: string
  body1_he: string
  body1_en: string
  body2_he: string
  body2_en: string
  cta_he: string
  cta_en: string
  imageUrl: string
}

interface StorySectionProps {
  locale: string
  content?: HomeStoryContent
}

export function StorySection({ locale, content }: StorySectionProps) {
  const t = useTranslations('home.story')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const isHe = locale === 'he'
  const heading = (isHe ? content?.heading_he : content?.heading_en) || t('heading')
  const body1 = (isHe ? content?.body1_he : content?.body1_en) || t('body1')
  const body2 = (isHe ? content?.body2_he : content?.body2_en) || t('body2')
  const cta = (isHe ? content?.cta_he : content?.cta_en) || t('cta')
  const imageUrl = content?.imageUrl || ''

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Image column — mobile: top, desktop: start */}
          <motion.div
            className="order-1"
            initial={shouldAnimate ? { opacity: 0, x: -30 } : false}
            whileInView={shouldAnimate ? { opacity: 1, x: 0 } : undefined}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-bg flex items-center justify-center">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <svg
                  aria-hidden="true"
                  className="w-20 h-20 text-border"
                  viewBox="0 0 80 80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  {/* Simple wood / craftsmanship icon */}
                  <path d="M20 60 L20 28 Q20 20 28 20 L52 20 Q60 20 60 28 L60 60" />
                  <path d="M14 60 L66 60" strokeLinecap="round" />
                  <path d="M30 20 L30 60" strokeDasharray="3 3" />
                  <path d="M50 20 L50 60" strokeDasharray="3 3" />
                  <path d="M20 36 L60 36" />
                  <path d="M20 48 L60 48" />
                  <circle cx="40" cy="28" r="3" fill="currentColor" stroke="none" />
                </svg>
              )}
            </div>
          </motion.div>

          {/* Text column — mobile: below, desktop: end */}
          <motion.div
            className="order-2"
            initial={shouldAnimate ? { opacity: 0, x: 30 } : false}
            whileInView={shouldAnimate ? { opacity: 1, x: 0 } : undefined}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          >
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-text-main mb-4">
              {heading}
            </h2>
            <p className="text-text-muted leading-relaxed mb-4">{body1}</p>
            <p className="text-text-muted leading-relaxed mb-6">{body2}</p>
            <Link
              href="/about"
              className="text-primary font-semibold underline hover:text-primary-600 transition-colors duration-150"
            >
              {cta}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
