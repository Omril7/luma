'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'

interface InstagramSectionProps {
  locale: string
}

const TILE_COUNT = 6

export function InstagramSection({ locale: _locale }: InstagramSectionProps) {
  const t = useTranslations('home.instagram')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  return (
    <section className="py-16 md:py-20 bg-secondary">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Heading */}
        <motion.div
          className="text-center mb-8"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-text-main mb-2">{t('heading')}</h2>
          <p className="text-primary font-semibold text-lg">{t('handle')}</p>
        </motion.div>

        {/* Grid of placeholder tiles */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-2xl mx-auto">
          {Array.from({ length: TILE_COUNT }).map((_, index) => (
            <motion.div
              key={index}
              initial={shouldAnimate ? { opacity: 0, scale: 0.92 } : false}
              whileInView={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                delay: index * 0.06,
                duration: 0.35,
                ease: 'easeOut',
              }}
              className="aspect-square rounded bg-bg border border-border flex items-center justify-center"
            >
              <svg
                aria-hidden="true"
                className="w-8 h-8 text-border"
                viewBox="0 0 32 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="4" y="4" width="24" height="24" rx="6" />
                <circle cx="16" cy="16" r="6" />
                <circle cx="23" cy="9" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </motion.div>
          ))}
        </div>

        {/* Coming soon text */}
        <p className="text-text-muted text-sm text-center mt-4">{t('coming')}</p>
      </div>
    </section>
  )
}
