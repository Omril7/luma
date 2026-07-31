'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'
import { TestimonialsCarousel } from './TestimonialsCarousel'

export interface TestimonialItem {
  quote_he: string
  quote_en: string
  author_he: string
  author_en: string
  location_he: string
  location_en: string
  rating: number
}

interface TestimonialsSectionProps {
  locale: string
  items: TestimonialItem[]
}

export function TestimonialsSection({ locale, items }: TestimonialsSectionProps) {
  const t = useTranslations('home.testimonials')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  if (items.length === 0) return null

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Heading */}
        <motion.h2
          className="font-heading text-3xl md:text-4xl font-semibold text-text-main text-center mb-10 md:mb-14"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {t('heading')}
        </motion.h2>

        {/* Carousel */}
        <TestimonialsCarousel items={items} locale={locale} />
      </div>
    </section>
  )
}
