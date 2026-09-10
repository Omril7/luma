'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import { useTranslations } from 'next-intl'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import { StarRating } from '@/components/ui/StarRating'
import type { PublicReviewDTO } from '@/shared/types'

interface ReviewsCarouselProps {
  reviews: PublicReviewDTO[]
  locale: string
  /** 'responsive' = 1/2/3 cards per view by viewport (full-width placement).
   *  'single' = one card per view — for narrow/embedded columns where 3 cards would be unreadable. */
  perView?: 'responsive' | 'single'
}

function formatDate(dateStr: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    year: 'numeric',
    month: 'long',
  }).format(new Date(dateStr))
}

export function ReviewsCarousel({ reviews, locale, perView = 'responsive' }: ReviewsCarouselProps) {
  const t = useTranslations('reviews')
  const isRtl = locale === 'he'

  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: isRtl ? 'rtl' : 'ltr',
    align: 'start',
    loop: false,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    if (!lightbox) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
    setCanPrev(emblaApi.canScrollPrev())
    setCanNext(emblaApi.canScrollNext())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)
    emblaApi.on('reInit', onSelect)
  }, [emblaApi, onSelect])

  if (reviews.length === 0) return null

  return (
    <div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {reviews.map((review) => {
            const comment = locale === 'he' ? review.comment_he : review.comment_en
            const fallbackComment = locale === 'he' ? review.comment_en : review.comment_he

            return (
              <div
                key={review.id}
                className={
                  perView === 'single'
                    ? 'min-w-0 shrink-0 grow-0 basis-full'
                    : 'min-w-0 shrink-0 grow-0 basis-full sm:basis-1/2 lg:basis-1/3'
                }
              >
                <div className="h-full bg-surface rounded-lg border border-border p-6 shadow-soft flex flex-col gap-3">
                  <StarRating value={review.rating} readonly size="sm" />
                  {review.imageUrl && (
                    <button
                      type="button"
                      onClick={() =>
                        setLightbox({ url: review.imageUrl!, name: review.customerName })
                      }
                      className="relative block aspect-[4/3] w-full overflow-hidden rounded-md border border-border cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Image
                        src={review.imageUrl}
                        alt={t('imageAlt', { name: review.customerName })}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover"
                      />
                    </button>
                  )}
                  {(comment || fallbackComment) && (
                    <blockquote className="text-text-main text-sm leading-relaxed flex-1">
                      {comment || fallbackComment}
                    </blockquote>
                  )}
                  <footer>
                    <p className="font-semibold text-text-main text-sm">{review.customerName}</p>
                    <p className="text-text-muted text-xs">
                      {formatDate(review.createdAt, locale)}
                    </p>
                  </footer>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {reviews.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label={t('carouselPrev')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-muted hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isRtl ? (
              <ChevronRight size={18} aria-hidden="true" />
            ) : (
              <ChevronLeft size={18} aria-hidden="true" />
            )}
          </button>

          <div className="flex items-center gap-1.5">
            {reviews.map((_, i) => (
              <button
                key={i}
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
            disabled={!canNext}
            aria-label={t('carouselNext')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-muted hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isRtl ? (
              <ChevronLeft size={18} aria-hidden="true" />
            ) : (
              <ChevronRight size={18} aria-hidden="true" />
            )}
          </button>
        </div>
      )}

      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('imageAlt', { name: lightbox.name })}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label={t('imageClose')}
            className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X size={20} aria-hidden="true" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.url}
            alt={t('imageAlt', { name: lightbox.name })}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
