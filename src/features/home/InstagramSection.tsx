'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'
import { InstagramIcon } from '@/components/icons/InstagramIcon'

export interface InstagramHighlightItem {
  id: string
  url: string
  linkUrl?: string
}

interface InstagramSectionProps {
  locale: string
  items: InstagramHighlightItem[]
  instagramUrl?: string
}

const PLACEHOLDER_TILE_COUNT = 6

export function InstagramSection({ locale: _locale, items, instagramUrl }: InstagramSectionProps) {
  const t = useTranslations('home.instagram')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  return (
    <section className="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Heading */}
        <motion.div
          className="text-center mb-8"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-text-main mb-2">
            {t('heading')}
          </h2>
          {instagramUrl ? (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-semibold text-lg hover:underline underline-offset-2"
            >
              {t('handle')}
            </a>
          ) : (
            <p className="text-primary font-semibold text-lg">{t('handle')}</p>
          )}
        </motion.div>

        {items.length > 0 ? (
          /* Real, admin-curated highlights */
          <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-2xl mx-auto">
            {items.map((item, index) => {
              const href = item.linkUrl || instagramUrl
              const Tile = (
                <motion.div
                  initial={shouldAnimate ? { opacity: 0, scale: 0.92 } : false}
                  whileInView={shouldAnimate ? { opacity: 1, scale: 1 } : undefined}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{
                    delay: index * 0.06,
                    duration: 0.35,
                    ease: 'easeOut',
                  }}
                  className="aspect-square rounded overflow-hidden bg-bg border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </motion.div>
              )

              return href ? (
                <a
                  key={item.id}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('viewPost')}
                >
                  {Tile}
                </a>
              ) : (
                <div key={item.id}>{Tile}</div>
              )
            })}
          </div>
        ) : (
          /* Placeholder grid — shown until the admin adds real highlights */
          <>
            <div className="grid grid-cols-3 gap-2 md:gap-3 max-w-2xl mx-auto">
              {Array.from({ length: PLACEHOLDER_TILE_COUNT }).map((_, index) => (
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
                  <InstagramIcon
                    aria-hidden="true"
                    strokeWidth={1.5}
                    className="w-8 h-8 text-border"
                  />
                </motion.div>
              ))}
            </div>
            <p className="text-text-muted text-sm text-center mt-4">{t('coming')}</p>
          </>
        )}
      </div>
    </section>
  )
}
