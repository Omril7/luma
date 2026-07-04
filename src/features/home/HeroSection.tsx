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
  const isRTL = locale === 'he'

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '972500000000'
  const whatsappUrl = `https://wa.me/${whatsappNumber}`

  const entranceProps = shouldAnimate
    ? {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: 'easeOut' },
      }
    : { initial: false as const }

  const imageEntranceProps = shouldAnimate
    ? {
        initial: { opacity: 0, scale: 1.06 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.8, ease: 'easeOut' },
      }
    : { initial: false as const }

  return (
    <section className="relative flex flex-col overflow-hidden md:min-h-dvh md:flex-row">
      {/* Wall-color panel — matches the cream wall in the photo */}
      <div className="relative flex flex-1 items-center bg-bg px-4 py-16 md:px-12 md:py-24 lg:px-16">
        <motion.div {...entranceProps} className="max-w-xl">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">
              {t('eyebrow')}
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold text-text-main leading-tight">
            {t('heading')}
          </h1>
          <p className="mb-8 mt-4 max-w-md text-lg text-text-muted md:text-xl">{t('subheading')}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact"
              className="inline-block cursor-pointer rounded-lg bg-primary px-6 py-3 font-semibold text-surface transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary-600 hover:shadow-soft"
            >
              {t('contactCta')}
            </Link>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block cursor-pointer rounded-lg border border-border px-6 py-3 font-medium text-text-main transition-all duration-150 hover:-translate-y-0.5 hover:bg-secondary"
            >
              {t('whatsappCta')}
            </a>
          </div>
        </motion.div>

        {/* Decorative scroll indicator — desktop only, section is full-height there */}
        <div className="absolute bottom-8 start-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 md:flex">
          <motion.div
            animate={shouldAnimate ? { y: [0, 6, 0] } : undefined}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border-2 border-border flex items-start justify-center pt-1"
          >
            <div className="w-1 h-2 rounded-full bg-text-muted" />
          </motion.div>
        </div>
      </div>

      {/* Image panel — half width on desktop, framed like an inset photo */}
      <div className="relative aspect-[4/5] md:aspect-auto md:flex-1 overflow-hidden">
        <motion.div {...imageEntranceProps} className="absolute inset-0">
          <Image
            src="/hero2.jpeg"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className={cn('object-cover', locale === 'en' && '-scale-x-100')}
          />
        </motion.div>
        {/* Soft blend into the wall-color panel on desktop (gradient direction must
            follow the physical side the text panel sits on, since Tailwind's
            gradient utilities aren't logical/RTL-aware like start/end spacing) */}
        <div
          aria-hidden="true"
          className={[
            'pointer-events-none absolute inset-y-0 start-0 hidden w-24 from-bg to-transparent md:block',
            isRTL ? 'bg-gradient-to-l' : 'bg-gradient-to-r',
          ].join(' ')}
        />
      </div>
    </section>
  )
}
