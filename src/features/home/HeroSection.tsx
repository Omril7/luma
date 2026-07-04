'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

interface HeroSectionProps {
  locale: string
}

export function HeroSection({ locale }: HeroSectionProps) {
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

  return (
    <section className="relative min-h-dvh flex flex-col justify-center bg-gradient-to-b from-bg to-secondary overflow-hidden">
      <Image
        src="/hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn('object-cover', locale === 'en' && '-scale-x-100')}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-b from-[#faf5ea]/40 via-[#faf5ea]/10 to-[#faf5ea]/40"
      />

      <div className="relative max-w-7xl mx-auto w-full px-4 md:px-8 py-24">
        <motion.div {...entranceProps} className="max-w-xl">
          <h1 className="font-heading text-4xl md:text-6xl lg:text-7xl font-semibold text-text-main leading-tight">
            {t('heading')}
          </h1>
          <p className="text-lg md:text-xl text-primary/70 mt-4 mb-8 max-w-md">{t('subheading')}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-block bg-primary hover:bg-primary-600 text-surface rounded-lg px-6 py-3 font-semibold transition-colors duration-150 cursor-pointer"
            >
              {t('contactCta')}
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-border text-text-main hover:bg-secondary rounded-lg px-6 py-3 font-medium transition-colors duration-150 cursor-pointer"
            >
              {t('whatsappCta')}
            </a>
          </div>
        </motion.div>
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
