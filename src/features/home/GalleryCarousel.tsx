'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'
import type { GalleryImageDTO } from '@/server/services/adminGalleryService'

interface GalleryCarouselProps {
  images: GalleryImageDTO[]
  locale: string
}

const AUTOPLAY_INTERVAL_MS = 2000

export function GalleryCarousel({ images, locale }: GalleryCarouselProps) {
  const t = useTranslations('home.gallery')
  const tGallery = useTranslations('gallery')
  const { a11y } = useUiStore()
  const isRtl = locale === 'he'
  const shouldAutoplay = !a11y.noMotion

  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: isRtl ? 'rtl' : 'ltr',
    align: 'start',
    loop: true,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  // Autoplay — paused on hover/focus so a visitor reading a caption or using
  // the keyboard doesn't have the slide swapped out from under them.
  const pausedRef = useRef(isPaused)
  pausedRef.current = isPaused
  useEffect(() => {
    if (!emblaApi || !shouldAutoplay) return
    const id = setInterval(() => {
      if (!pausedRef.current) emblaApi.scrollNext()
    }, AUTOPLAY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [emblaApi, shouldAutoplay])

  if (images.length === 0) return null

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {images.map((image) => {
            const title = locale === 'he' ? image.title_he : image.title_en
            const altText =
              (locale === 'he' ? image.altText_he : image.altText_en) || title || tGallery('title')

            return (
              <div
                key={image.id}
                className="min-w-0 shrink-0 grow-0 basis-[70%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <Link
                  href="/gallery"
                  className="group block relative aspect-square overflow-hidden rounded-xl border border-border bg-secondary"
                >
                  <Image
                    src={image.url}
                    alt={altText}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 70vw"
                    className="object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                  />
                  {title && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-8">
                      <p className="text-sm font-medium text-white line-clamp-1">{title}</p>
                    </div>
                  )}
                </Link>
              </div>
            )
          })}
        </div>
      </div>

      {images.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label={t('carouselPrev')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-muted hover:bg-secondary transition-colors cursor-pointer"
          >
            {isRtl ? (
              <ChevronRight size={18} aria-hidden="true" />
            ) : (
              <ChevronLeft size={18} aria-hidden="true" />
            )}
          </button>

          <div className="flex items-center gap-1.5">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={t('carouselDot', { index: i + 1 })}
                aria-current={i === selectedIndex ? 'true' : undefined}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === selectedIndex ? 'w-5 bg-primary' : 'w-2 bg-border hover:bg-primary/50'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label={t('carouselNext')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-muted hover:bg-secondary transition-colors cursor-pointer"
          >
            {isRtl ? (
              <ChevronLeft size={18} aria-hidden="true" />
            ) : (
              <ChevronRight size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
