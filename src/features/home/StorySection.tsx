'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'

interface StorySectionProps {
  locale: string
}

export function StorySection({ locale: _locale }: StorySectionProps) {
  const t = useTranslations('home.story')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.reduceMotion

  return (
    <section className="py-16 md:py-24 bg-secondary">
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
            <div className="aspect-[3/4] rounded-2xl bg-bg border border-border flex items-center justify-center">
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
            <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-4">{t('heading')}</h2>
            <p className="text-text-muted leading-relaxed mb-4">{t('body1')}</p>
            <p className="text-text-muted leading-relaxed mb-6">{t('body2')}</p>
            <Link
              href="/about"
              className="text-primary font-semibold underline hover:text-primary-600 transition-colors duration-150"
            >
              {t('cta')}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
