'use client'

import Image from 'next/image'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const DEFAULT_WHATSAPP_NUMBER = '972500000000'

export interface HomeHeroContent {
  eyebrow_he: string
  eyebrow_en: string
  heading_he: string
  heading_en: string
  subheading_he: string
  subheading_en: string
}

interface HeroSectionProps {
  locale: string
  whatsappNumber: string
  content?: HomeHeroContent
}

export function HeroSection({ locale, whatsappNumber, content }: HeroSectionProps) {
  const t = useTranslations('home.hero')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const isHe = locale === 'he'
  const eyebrow = (isHe ? content?.eyebrow_he : content?.eyebrow_en) || t('eyebrow')
  const heading = (isHe ? content?.heading_he : content?.heading_en) || t('heading')
  const subheading = (isHe ? content?.subheading_he : content?.subheading_en) || t('subheading')
  // Charcoal is fixed (never swapped by dark/contrast/etc.) and reads well against the
  // photo's tan wall in every visual mode, since the photo itself is unaffected by them.
  // But with the image hidden, the section falls back to the theme's --color-bg, which
  // *does* swap dark in dark/contrast mode — fixed charcoal-on-charcoal would then be
  // unreadable. So fall back to the normal adaptive theme tokens once there's no photo.
  const onPhoto = !a11y.hideImages

  const whatsappUrl = `https://wa.me/${whatsappNumber || DEFAULT_WHATSAPP_NUMBER}`

  const entranceProps = shouldAnimate
    ? {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6, ease: 'easeOut' },
      }
    : { initial: false as const }

  // Scale-only entrance (no opacity fade): a fade-from-0 ships opacity:0 in the
  // SSR HTML, so the hero — the page's LCP element — can't paint until hydration.
  const imageEntranceProps = shouldAnimate
    ? {
        initial: { scale: 1.06 },
        animate: { scale: 1 },
        transition: { duration: 0.8, ease: 'easeOut' },
      }
    : { initial: false as const }

  return (
    <section className="relative w-full min-h-[560px] aspect-[4/5] overflow-hidden bg-bg sm:aspect-[4/3] sm:min-h-[600px] md:aspect-auto md:min-h-dvh">
      {/* Full-bleed photo. Mirrored in English so the empty wall (where the
          text sits) stays on the same physical side as the text panel. */}
      <motion.div {...imageEntranceProps} className="absolute inset-0">
        <Image
          src="/hero2.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className={cn('object-cover', locale === 'en' && '-scale-x-100')}
        />
      </motion.div>

      {/* Text content, overlaid on the logical start side (right in Hebrew, left in English).
          No scrim — colors read directly against the photo (see `onPhoto` above for why). */}
      <div className="absolute inset-0 flex items-center px-5 pb-20 pt-8 sm:px-10 sm:pb-34 sm:pt-0 md:px-12 md:pb-48 md:pt-0 lg:px-16">
        <motion.div {...entranceProps} className="max-w-[230px] sm:max-w-xs md:max-w-xl">
          <div className="mb-4 flex items-center gap-2.5">
            <span
              className={cn('h-px w-8', onPhoto ? 'bg-charcoal/60' : 'bg-accent')}
              aria-hidden="true"
            />
            <span
              className={cn(
                'text-xs font-semibold uppercase tracking-[0.15em]',
                onPhoto ? 'text-charcoal' : 'text-accent'
              )}
            >
              {eyebrow}
            </span>
          </div>
          <h1
            className={cn(
              'font-heading text-4xl md:text-5xl lg:text-6xl font-semibold leading-tight',
              onPhoto ? 'text-charcoal' : 'text-text-main'
            )}
          >
            {heading}
          </h1>
          <p
            className={cn(
              'mb-8 mt-4 max-w-md text-lg md:text-xl',
              onPhoto ? 'text-charcoal' : 'text-text-muted'
            )}
          >
            {subheading}
          </p>
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
              className={cn(
                'inline-block cursor-pointer rounded-lg border px-6 py-3 font-medium transition-all duration-150 hover:-translate-y-0.5',
                onPhoto
                  ? 'border-charcoal text-charcoal hover:bg-charcoal/5'
                  : 'border-border text-text-main hover:bg-secondary'
              )}
            >
              {t('whatsappCta')}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
