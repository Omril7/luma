'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Fade only on image *changes* — fading the initial image ships opacity:0 in
  // the SSR HTML and delays the page's LCP until hydration.
  const didMountRef = useRef(false)
  useEffect(() => {
    didMountRef.current = true
  }, [])

  const currentImage = images[selectedIndex]

  function prev() {
    setSelectedIndex((i) => (i - 1 + images.length) % images.length)
  }

  function next() {
    setSelectedIndex((i) => (i + 1) % images.length)
  }

  const altText = currentImage
    ? locale === 'he'
      ? currentImage.altText_he
      : currentImage.altText_en
    : productName

  return (
    <div className="flex flex-col gap-3">
      {/* Main image area */}
      <div className="relative overflow-hidden rounded-xl bg-secondary aspect-[4/3]">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIndex}
            className="absolute inset-0"
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
                className="object-cover"
                priority={selectedIndex === 0}
                fetchPriority={selectedIndex === 0 ? 'high' : undefined}
              />
            ) : (
              <FurniturePlaceholder />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Prev / Next buttons — only when >1 image */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={t('prevImage')}
              className="absolute start-2 top-1/2 -translate-y-1/2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm border border-border text-text-main hover:bg-surface transition-colors duration-150 cursor-pointer shadow-sm"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t('nextImage')}
              className="absolute end-2 top-1/2 -translate-y-1/2 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm border border-border text-text-main hover:bg-surface transition-colors duration-150 cursor-pointer shadow-sm"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip — desktop only, md+ */}
      {images.length > 1 && (
        <div className="hidden md:grid grid-cols-5 gap-2">
          {images.slice(0, 5).map((img, i) => {
            const thumbAlt = locale === 'he' ? img.altText_he : img.altText_en
            return (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedIndex(i)}
                aria-label={t('imageN', { n: i + 1 })}
                aria-pressed={i === selectedIndex}
                className={`relative aspect-square rounded-md overflow-hidden border-2 cursor-pointer transition-all duration-150 ${
                  i === selectedIndex
                    ? 'border-primary ring-2 ring-primary ring-offset-1'
                    : 'border-transparent hover:border-border'
                }`}
              >
                <Image
                  src={img.url}
                  alt={thumbAlt}
                  fill
                  sizes="(max-width: 768px) 0px, 10vw"
                  className="object-cover"
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Dot indicators — mobile only */}
      {images.length > 1 && (
        <div
          className="flex md:hidden justify-center gap-1.5"
          role="tablist"
          aria-label={productName}
        >
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === selectedIndex}
              onClick={() => setSelectedIndex(i)}
              aria-label={t('imageN', { n: i + 1 })}
              className="group flex h-6 w-6 items-center justify-center rounded-full cursor-pointer"
            >
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full transition-colors duration-150 ${
                  i === selectedIndex ? 'bg-primary' : 'bg-border group-hover:bg-text-muted'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
