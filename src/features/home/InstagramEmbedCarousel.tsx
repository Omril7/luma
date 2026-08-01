'use client'

import { useCallback, useEffect, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { useTranslations } from 'next-intl'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { InstagramEmbedBlockquote } from '@/components/ui/InstagramEmbedBlockquote'

interface InstagramEmbedItem {
  id: string
  permalink: string
}

interface InstagramEmbedCarouselProps {
  items: InstagramEmbedItem[]
  locale: string
}

export function InstagramEmbedCarousel({ items, locale }: InstagramEmbedCarouselProps) {
  const t = useTranslations('home.instagram')
  const isRtl = locale === 'he'

  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: isRtl ? 'rtl' : 'ltr',
    align: 'center',
    loop: false,
  })

  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

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
    return () => {
      emblaApi.off('select', onSelect)
      emblaApi.off('reInit', onSelect)
    }
  }, [emblaApi, onSelect])

  if (items.length === 0) return null

  return (
    <div className="mt-8">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4">
          {items.map((item) => (
            <div key={item.id} className="min-w-0 shrink-0 grow-0 basis-full sm:basis-[420px]">
              <InstagramEmbedBlockquote permalink={item.permalink} />
            </div>
          ))}
        </div>
      </div>

      {items.length > 1 && (
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
            {items.map((item, i) => (
              <button
                key={item.id}
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
    </div>
  )
}
