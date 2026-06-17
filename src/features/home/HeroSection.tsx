'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'

interface HeroSectionProps {
  locale: string
}

export function HeroSection({ locale: _locale }: HeroSectionProps) {
  const t = useTranslations('home.hero')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '972500000000'
  const whatsappUrl = `https://wa.me/${whatsappNumber}`

  const entranceProps = shouldAnimate
    ? {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: 'easeOut' },
      }
    : { initial: false as const }

  const imageProps = shouldAnimate
    ? {
        initial: { opacity: 0, scale: 0.96 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.7, ease: 'easeOut', delay: 0.2 },
      }
    : { initial: false as const }

  return (
    <section className="relative min-h-dvh flex flex-col justify-center bg-gradient-to-b from-bg to-secondary overflow-hidden">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Text column */}
          <motion.div {...entranceProps} className="order-2 md:order-1">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-text-main leading-tight">
              {t('heading')}
            </h1>
            <p className="text-lg md:text-xl text-text-muted mt-4 mb-8 max-w-md">
              {t('subheading')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-block bg-primary hover:bg-primary-600 text-surface rounded-full px-6 py-3 font-semibold transition-colors duration-150 cursor-pointer"
              >
                {t('shopCta')}
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border border-border text-text-main hover:bg-secondary rounded-full px-6 py-3 font-medium transition-colors duration-150 cursor-pointer"
              >
                {t('whatsappCta')}
              </a>
            </div>
          </motion.div>

          {/* Image column */}
          <motion.div {...imageProps} className="order-1 md:order-2">
            <div className="bg-secondary rounded-2xl aspect-[4/3] flex items-center justify-center border border-border">
              <svg
                aria-hidden="true"
                className="w-24 h-24 text-border"
                viewBox="0 0 96 96"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                {/* Wood grain / furniture placeholder */}
                <rect x="12" y="36" width="72" height="44" rx="4" />
                <rect x="20" y="24" width="56" height="16" rx="3" />
                <line x1="20" y1="80" x2="20" y2="90" />
                <line x1="76" y1="80" x2="76" y2="90" />
                <line x1="32" y1="80" x2="32" y2="90" />
                <line x1="64" y1="80" x2="64" y2="90" />
                <line x1="12" y1="52" x2="84" y2="52" strokeDasharray="4 4" />
                <line x1="12" y1="62" x2="84" y2="62" strokeDasharray="4 4" />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Decorative scroll indicator */}
      <div className="absolute bottom-8 start-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <motion.div
          animate={shouldAnimate ? { y: [0, 6, 0] } : undefined}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="w-5 h-8 rounded-full border-2 border-border flex items-start justify-center pt-1"
        >
          <div className="w-1 h-2 rounded-full bg-text-muted" />
        </motion.div>
      </div>
    </section>
  )
}
