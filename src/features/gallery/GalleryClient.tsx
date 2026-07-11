'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import type { GalleryImageDTO } from '@/server/services/adminGalleryService'

interface GalleryIntro {
  title_he: string
  title_en: string
  subtitle_he: string
  subtitle_en: string
}

interface GalleryClientProps {
  locale: string
  intro: GalleryIntro
  images: GalleryImageDTO[]
}

export function GalleryClient({ locale, intro, images }: GalleryClientProps) {
  const t = useTranslations('gallery')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const isRtl = locale === 'he'

  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const title = (locale === 'he' ? intro.title_he : intro.title_en) || t('title')
  const subtitle = locale === 'he' ? intro.subtitle_he : intro.subtitle_en

  const close = useCallback(() => setOpenIndex(null), [])
  const showPrev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length)),
    [images.length]
  )
  const showNext = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % images.length)),
    [images.length]
  )

  // Keyboard controls for the lightbox
  useEffect(() => {
    if (openIndex === null) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowLeft') (isRtl ? showNext : showPrev)()
      else if (e.key === 'ArrowRight') (isRtl ? showPrev : showNext)()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openIndex, close, showPrev, showNext, isRtl])

  const current = openIndex !== null ? images[openIndex] : null

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <motion.div
          className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="font-heading text-3xl font-semibold text-text-main md:text-4xl lg:text-5xl">
            {title}
          </h1>
          {subtitle && <p className="mt-4 text-lg leading-relaxed text-text-muted">{subtitle}</p>}
        </motion.div>

        {images.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <ImageIcon
                size={32}
                strokeWidth={1.25}
                aria-hidden="true"
                className="text-text-muted"
              />
            </div>
            <p className="text-text-muted">{t('empty')}</p>
          </div>
        ) : (
          <div className="columns-2 gap-3 sm:gap-4 md:columns-3">
            {images.map((image, index) => {
              const alt = (locale === 'he' ? image.altText_he : image.altText_en) || ''
              return (
                <motion.button
                  key={image.id}
                  type="button"
                  onClick={() => setOpenIndex(index)}
                  className="mb-3 block w-full cursor-pointer overflow-hidden rounded-lg border border-border bg-secondary sm:mb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  whileHover={shouldAnimate ? { opacity: 0.9 } : undefined}
                  aria-label={alt || t('imageCount', { current: index + 1, total: images.length })}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- natural masonry sizing needs the browser's intrinsic image dimensions; width/height metadata isn't stored for gallery images */}
                  <img src={image.url} alt={alt} loading="lazy" className="block w-full" />
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {current && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={current.altText_he || current.altText_en || t('title')}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          >
            <button
              type="button"
              onClick={close}
              aria-label={t('lightboxClose')}
              className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <X size={22} aria-hidden="true" />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    showPrev()
                  }}
                  aria-label={t('lightboxPrev')}
                  className="absolute start-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:start-4"
                >
                  <ChevronLeft size={22} aria-hidden="true" className="rtl:hidden" />
                  <ChevronRight size={22} aria-hidden="true" className="hidden rtl:block" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    showNext()
                  }}
                  aria-label={t('lightboxNext')}
                  className="absolute end-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:end-4"
                >
                  <ChevronRight size={22} aria-hidden="true" className="rtl:hidden" />
                  <ChevronLeft size={22} aria-hidden="true" className="hidden rtl:block" />
                </button>
              </>
            )}

            <motion.div
              key={current.id}
              className="relative max-h-full max-w-full"
              initial={shouldAnimate ? { opacity: 0, scale: 0.96 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- lightbox displays the image at its natural aspect ratio within a max-height/width box */}
              <img
                src={current.url}
                alt={(locale === 'he' ? current.altText_he : current.altText_en) || ''}
                className="max-h-[85vh] max-w-full rounded-lg object-contain"
              />
              {images.length > 1 && (
                <p className="mt-3 text-center text-sm text-white/70">
                  {t('imageCount', { current: (openIndex ?? 0) + 1, total: images.length })}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
