'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'
import { StarRating } from '@/components/ui/StarRating'

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

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {items.map((item, index) => {
            const quote = locale === 'he' ? item.quote_he : item.quote_en
            const author = locale === 'he' ? item.author_he : item.author_en
            const location = locale === 'he' ? item.location_he : item.location_en

            return (
              <motion.div
                key={index}
                initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                viewport={{ once: true, margin: '-80px' }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.4,
                  ease: 'easeOut',
                }}
                className="bg-surface rounded-lg border border-border p-6 shadow-soft"
              >
                {/* Stars */}
                <div className="mb-3">
                  <StarRating value={item.rating} readonly size="sm" />
                </div>

                {/* Quote */}
                <blockquote className="text-text-main italic text-sm leading-relaxed mb-4">
                  {quote}
                </blockquote>

                {/* Author */}
                <footer>
                  <p className="font-semibold text-text-main text-sm">{author}</p>
                  <p className="text-text-muted text-xs">{location}</p>
                </footer>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
