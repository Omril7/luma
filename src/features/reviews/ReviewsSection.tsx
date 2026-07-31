'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { useUiStore } from '@/stores/uiStore'
import { StarRating } from '@/components/ui/StarRating'
import { ReviewsCarousel } from './ReviewsCarousel'
import { ReviewForm } from './ReviewForm'
import type { PublicReviewDTO } from '@/shared/types'

interface ReviewsSectionProps {
  reviews: PublicReviewDTO[]
  productId: string
  locale: string
  /** 'standalone' = own top margin, for when this is the only bottom section on the page.
   *  'embedded' = no top margin, for placement inside a shared grid cell (e.g. next to FAQ). */
  variant?: 'standalone' | 'embedded'
}

export function ReviewsSection({
  reviews,
  productId,
  locale,
  variant = 'standalone',
}: ReviewsSectionProps) {
  const t = useTranslations('reviews')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const average =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
      : 0

  return (
    <section className={variant === 'embedded' ? '' : 'mt-16 md:mt-24'}>
      <motion.div
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
        initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
        whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h2 className="text-2xl font-bold text-text-main">{t('title')}</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(average)} readonly size="sm" />
            <span className="text-sm text-text-muted">
              {t('average', { rating: average, count: reviews.length })}
            </span>
          </div>
        )}
      </motion.div>

      {reviews.length > 0 ? (
        <ReviewsCarousel reviews={reviews} locale={locale} />
      ) : (
        <p className="mb-8 text-sm text-text-muted">{t('empty')}</p>
      )}

      <div className="mt-8 max-w-xl">
        <ReviewForm productId={productId} locale={locale} />
      </div>
    </section>
  )
}
