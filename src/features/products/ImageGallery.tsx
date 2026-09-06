'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'
import type { ProductImageDTO } from '@/shared/types'

interface ImageGalleryProps {
  images: ProductImageDTO[]
  productName: string
  locale: string
}

function FurniturePlaceholder() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-secondary">
      <svg
        aria-hidden="true"
        className="h-16 w-16 text-border"
        fill="none"
        viewBox="0 0 48 48"
        stroke="currentColor"
        strokeWidth={1}
      >
        <rect x="6" y="10" width="36" height="28" rx="3" />
        <path d="M6 30l10-10 8 8 6-6 12 8" />
        <circle cx="16" cy="20" r="3" />
      </svg>
    </div>
  )
}

export function ImageGallery({ images, productName, locale }: ImageGalleryProps) {
  const t = useTranslations('product')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const isRtl = locale === 'he'
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [zoomOrigin, setZoomOrigin] = useState('50% 50%')
  const thumbStripRef = useRef<HTMLDivElement>(null)

  // Fade only on image *changes* — fading the initial image ships opacity:0 in
  // the SSR HTML and delays the page's LCP until hydration.
  const didMountRef = useRef(false)
  useEffect(() => {
    didMountRef.current = true
  }, [])

  const currentImage = images[selectedIndex]

  const prev = useCallback(
    () => setSelectedIndex((i) => (i - 1 + images.length) % images.length),
    [images.length]
  )
  const next = useCallback(() => setSelectedIndex((i) => (i + 1) % images.length), [images.length])

  function altFor(img: ProductImageDTO | undefined): string {
    if (!img) return productName
    return (locale === 'he' ? img.altText_he : img.altText_en) || productName
  }
  const altText = altFor(currentImage)

  // Keep the active thumbnail scrolled into view within the carousel strip.
  useEffect(() => {
    const active = thumbStripRef.current?.querySelector<HTMLElement>(
      `[data-thumb="${selectedIndex}"]`
    )
    active?.scrollIntoView({
      behavior: shouldAnimate ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center',
    })
  }, [selectedIndex, shouldAnimate])

  // Lightbox: keyboard controls + body scroll lock while open.
  useEffect(() => {
    if (!lightboxOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightboxOpen(false)
      else if (e.key === 'ArrowLeft') (isRtl ? next : prev)()
      else if (e.key === 'ArrowRight') (isRtl ? prev : next)()
    }
    window.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [lightboxOpen, isRtl, next, prev])

  // Reset zoom whenever the image changes or the lightbox toggles.
  useEffect(() => {
    setZoomed(false)
    setZoomOrigin('50% 50%')
  }, [selectedIndex, lightboxOpen])

  function handleZoomMove(e: React.MouseEvent<HTMLImageElement>) {
    if (!zoomed) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100
    const y = ((e.clientY - r.top) / r.height) * 100
    setZoomOrigin(`${x}% ${y}%`)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Main image area — click to open the zoomable lightbox */}
      <div className="relative overflow-hidden rounded-xl bg-secondary aspect-[4/3]">
        <AnimatePresence mode="wait">
          <motion.button
            type="button"
            key={selectedIndex}
            onClick={() => currentImage && setLightboxOpen(true)}
            aria-label={t('zoomImage')}
            className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            initial={shouldAnimate && didMountRef.current ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            exit={shouldAnimate ? { opacity: 0 } : undefined}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {currentImage ? (
              <Image
                src={currentImage.url}
                alt={altText}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain"
                priority={selectedIndex === 0}
                fetchPriority={selectedIndex === 0 ? 'high' : undefined}
              />
            ) : (
              <FurniturePlaceholder />
            )}
          </motion.button>
        </AnimatePresence>

        {/* Zoom affordance */}
        {currentImage && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 end-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm border border-border text-text-main shadow-sm"
          >
            <ZoomIn size={16} />
          </span>
        )}

        {/* Prev / Next buttons — only when >1 image */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={t('prevImage')}
              className="absolute start-2 top-1/2 -translate-y-1/2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm border border-border text-text-main hover:bg-surface transition-colors duration-150 cursor-pointer shadow-sm"
            >
              {isRtl ? (
                <ChevronRight size={20} aria-hidden="true" />
              ) : (
                <ChevronLeft size={20} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t('nextImage')}
              className="absolute end-2 top-1/2 -translate-y-1/2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm border border-border text-text-main hover:bg-surface transition-colors duration-150 cursor-pointer shadow-sm"
            >
              {isRtl ? (
                <ChevronLeft size={20} aria-hidden="true" />
              ) : (
                <ChevronRight size={20} aria-hidden="true" />
              )}
            </button>
          </>
        )}
      </div>

      {/* Thumbnail carousel — all images, horizontally scrollable on every viewport */}
      {images.length > 1 && (
        <div
          ref={thumbStripRef}
          role="tablist"
          aria-label={productName}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:thin] py-2"
        >
          {images.map((img, i) => {
            const thumbAlt = locale === 'he' ? img.altText_he : img.altText_en
            return (
              <button
                key={img.id}
                data-thumb={i}
                type="button"
                role="tab"
                aria-selected={i === selectedIndex}
                onClick={() => setSelectedIndex(i)}
                aria-label={t('imageN', { n: i + 1 })}
                className={`relative aspect-square w-16 shrink-0 snap-start overflow-hidden rounded-lg border-2 cursor-pointer transition-all duration-150 sm:w-20 ${
                  i === selectedIndex
                    ? 'border-primary ring-2 ring-primary ring-offset-1'
                    : 'border-transparent opacity-70 hover:opacity-100 hover:border-border'
                }`}
              >
                <Image src={img.url} alt={thumbAlt} fill sizes="80px" className="object-cover" />
              </button>
            )
          })}
        </div>
      )}

      {/* Zoomable lightbox */}
      <AnimatePresence>
        {lightboxOpen && currentImage && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={altText}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label={t('lightboxClose')}
              className="absolute end-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <X size={22} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setZoomed((z) => !z)
              }}
              aria-label={zoomed ? t('lightboxZoomOut') : t('lightboxZoomIn')}
              className="absolute start-4 top-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {zoomed ? (
                <ZoomOut size={22} aria-hidden="true" />
              ) : (
                <ZoomIn size={22} aria-hidden="true" />
              )}
            </button>

            {images.length > 1 && !zoomed && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    prev()
                  }}
                  aria-label={t('lightboxPrev')}
                  className="absolute start-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:start-4"
                >
                  {isRtl ? (
                    <ChevronRight size={22} aria-hidden="true" />
                  ) : (
                    <ChevronLeft size={22} aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    next()
                  }}
                  aria-label={t('lightboxNext')}
                  className="absolute end-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:end-4"
                >
                  {isRtl ? (
                    <ChevronLeft size={22} aria-hidden="true" />
                  ) : (
                    <ChevronRight size={22} aria-hidden="true" />
                  )}
                </button>
              </>
            )}

            <motion.div
              key={selectedIndex}
              className="relative flex max-h-full max-w-full items-center justify-center overflow-hidden"
              initial={shouldAnimate ? { opacity: 0, scale: 0.96 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- lightbox shows the image at natural aspect ratio with click-to-zoom */}
              <img
                src={currentImage.url}
                alt={altText}
                onClick={() => setZoomed((z) => !z)}
                onMouseMove={handleZoomMove}
                style={zoomed ? { transformOrigin: zoomOrigin } : undefined}
                className={`rounded-lg object-contain transition-transform duration-300 ${
                  zoomed
                    ? 'max-h-[85vh] max-w-[90vw] scale-[2] cursor-zoom-out sm:scale-[2.5]'
                    : 'max-h-[85vh] max-w-[90vw] cursor-zoom-in'
                }`}
              />
            </motion.div>

            {images.length > 1 && (
              <p className="pointer-events-none absolute inset-x-0 bottom-4 text-center text-sm text-white/70">
                {t('imageCount', { current: selectedIndex + 1, total: images.length })}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
