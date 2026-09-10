'use client'

import { useState } from 'react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { PenLine } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import type { HomeReviewDTO } from '@/shared/types'
import { TestimonialsCarousel } from './TestimonialsCarousel'
import { GlobalReviewModal } from './GlobalReviewModal'

interface TestimonialsSectionProps {
  locale: string
  reviews: HomeReviewDTO[]
}

export function TestimonialsSection({ locale, reviews }: TestimonialsSectionProps) {
  const t = useTranslations('home.testimonials')
  const tReviews = useTranslations('reviews')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const [modalOpen, setModalOpen] = useState(false)

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

        {reviews.length > 0 && <TestimonialsCarousel items={reviews} locale={locale} />}

        {/* "Write us a review" CTA — always shown, even with an empty carousel */}
        <div className={reviews.length > 0 ? 'mt-10 text-center' : 'text-center'}>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-primary px-6 font-semibold text-primary transition-colors hover:bg-primary hover:text-surface cursor-pointer"
          >
            <PenLine size={18} aria-hidden="true" />
            {tReviews('writeAboutUsCta')}
          </button>
        </div>
      </div>

      <GlobalReviewModal open={modalOpen} onClose={() => setModalOpen(false)} locale={locale} />
    </section>
  )
}
