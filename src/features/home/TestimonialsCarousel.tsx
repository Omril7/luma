'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import type { EmblaCarouselType } from 'embla-carousel'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { StarRating } from '@/components/ui/StarRating'
import type { TestimonialItem } from './TestimonialsSection'

interface TestimonialsCarouselProps {
  items: TestimonialItem[]
  locale: string
}

/** True modulo (unlike `%`, never negative) — wraps an index into [0, m). */
function mod(n: number, m: number) {
  return ((n % m) + m) % m
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

// A fixed-size window of real, modulo-wrapped `items` indices is kept mounted in the embla
// track at all times — comfortably more than the 3-per-view shown at desktop. Embla itself
// never loops (`loop: false`); instead, once the user scrolls near either edge of the window,
// we silently swap which real indices populate it and jump the scroll position back to the
// middle with no animation (`scrollTo(_, true)`) — invisible to the user, since the slide that
// was just selected lands in the exact same visual spot. This sidesteps embla's own loop/clone
// engine entirely, which turned out to be unreliable with a small, repeated dataset (occasional
// empty slot after a couple of clicks).
const WINDOW_SIZE = 9
const MIDDLE = Math.floor(WINDOW_SIZE / 2)
const EDGE_MARGIN = 2

/** Scales/fades/parallaxes each card by its distance from the centred snap. */
function useTweens(emblaApi: EmblaCarouselType | undefined, enabled: boolean) {
  const apply = useCallback((api: EmblaCarouselType) => {
    const progress = api.scrollProgress()
    const snaps = api.scrollSnapList()

    snaps.forEach((snap, slideIdx) => {
      const diff = snap - progress
      const t = diff * snaps.length
      const inner = api.slideNodes()[slideIdx]?.querySelector<HTMLElement>('[data-tween]')
      if (!inner) return

      // Floors kept high — our warm/beige palette makes a heavily faded card nearly disappear
      // against the section background instead of reading as "unfocused".
      const scale = clamp(1 - Math.abs(t) * 0.06, 0.93, 1)
      const opacity = clamp(1 - Math.abs(t) * 0.3, 0.7, 1)
      const parallax = t * -8 // % shift

      inner.style.transform = `scale(${scale}) translateX(${parallax}%)`
      inner.style.opacity = String(opacity)
    })
  }, [])

  useEffect(() => {
    if (!emblaApi || !enabled) return
    apply(emblaApi)
    emblaApi.on('reInit', apply).on('scroll', apply).on('slideFocus', apply)
    return () => {
      emblaApi.off('reInit', apply).off('scroll', apply).off('slideFocus', apply)
    }
  }, [emblaApi, enabled, apply])
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function Card({ item, locale, isRtl }: { item: TestimonialItem; locale: string; isRtl: boolean }) {
  const quote = locale === 'he' ? item.quote_he : item.quote_en
  const author = locale === 'he' ? item.author_he : item.author_en
  const location = locale === 'he' ? item.location_he : item.location_en

  return (
    // data-tween receives the JS-driven scale/opacity/parallax transforms; dir restores this
    // card's own text direction (the track itself is always fixed-ltr, see emblaOptions below).
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      data-tween
      className="h-full select-none bg-surface rounded-lg border border-border p-6 shadow-soft will-change-transform"
    >
      <div className="mb-3">
        <StarRating value={item.rating} readonly size="sm" />
      </div>
      <blockquote className="text-text-main italic text-sm leading-relaxed mb-4">
        {quote}
      </blockquote>
      <footer>
        <p className="font-semibold text-text-main text-sm">{author}</p>
        <p className="text-text-muted text-xs">{location}</p>
      </footer>
    </div>
  )
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

export function TestimonialsCarousel({ items, locale }: TestimonialsCarouselProps) {
  const t = useTranslations('home.testimonials')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const isRtl = locale === 'he'
  const n = items.length

  // Embla's own scroll direction is always 'ltr' — RTL locales are handled purely via `dir` on
  // each card. Embla's native `direction: 'rtl'` mode had real bugs when combined with
  // `loop: true`; since we no longer use embla's built-in loop at all (see WINDOW_SIZE comment
  // above), this is now mostly precautionary, but keeping it avoids re-testing that combination.
  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: 'ltr',
    align: 'center',
    loop: false,
    dragFree: true,
    startIndex: MIDDLE,
  })

  useTweens(emblaApi, shouldAnimate)

  // baseIndex = the real `items` index shown at window slot 0. Starts so the first real
  // testimonial (index 0) lands at the middle slot, matching the initial scroll position.
  const [baseIndex, setBaseIndex] = useState(() => (n > 0 ? mod(-MIDDLE, n) : 0))
  const [currentReal, setCurrentReal] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const skipJump = useRef(true)

  // Live UI (dots, arrow disabled-state) — cheap, safe to update on every 'select'.
  const onSelect = useCallback(
    (api: EmblaCarouselType) => {
      if (n === 0) return
      const selectedIdx = api.selectedScrollSnap()
      setCurrentReal(mod(baseIndex + selectedIdx, n))
      setCanPrev(api.canScrollPrev())
      setCanNext(api.canScrollNext())
    },
    [baseIndex, n]
  )

  // Recentering — only once the drag/scroll has fully settled, so we never cut off an
  // in-flight momentum animation.
  const onSettle = useCallback(
    (api: EmblaCarouselType) => {
      if (n === 0) return
      const selectedIdx = api.selectedScrollSnap()
      if (selectedIdx <= EDGE_MARGIN || selectedIdx >= WINDOW_SIZE - 1 - EDGE_MARGIN) {
        const realIdx = mod(baseIndex + selectedIdx, n)
        const newBase = mod(realIdx - MIDDLE, n)
        if (newBase !== baseIndex) setBaseIndex(newBase)
      }
    },
    [baseIndex, n]
  )

  useEffect(() => {
    if (!emblaApi) return
    onSelect(emblaApi)
    emblaApi.on('select', onSelect).on('settle', onSettle)
    return () => {
      emblaApi.off('select', onSelect).off('settle', onSettle)
    }
  }, [emblaApi, onSelect, onSettle])

  // After a recenter changes `baseIndex` (and the window's content re-renders to match), jump
  // straight back to the middle slot with no animation — invisible, since the slide that lands
  // there is the same real testimonial the user was already looking at.
  useEffect(() => {
    if (!emblaApi) return
    if (skipJump.current) {
      skipJump.current = false
      return
    }
    emblaApi.reInit()
    emblaApi.scrollTo(MIDDLE, true)
  }, [baseIndex, emblaApi])

  if (n === 0) return null

  const window_ = Array.from({ length: WINDOW_SIZE }, (_, i) => mod(baseIndex + i, n))

  function scrollToReal(realIdx: number) {
    if (!emblaApi) return
    const newBase = mod(realIdx - MIDDLE, n)
    skipJump.current = true
    setBaseIndex(newBase)
    setCurrentReal(realIdx)
    // Slides re-render with the new base synchronously enough for embla to jump on next tick.
    requestAnimationFrame(() => emblaApi.reInit())
    requestAnimationFrame(() => emblaApi.scrollTo(MIDDLE, true))
  }

  return (
    <div>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-8" dir="ltr">
          {window_.map((realIdx, slotIdx) => (
            <motion.div
              key={slotIdx}
              className="min-w-0 shrink-0 grow-0 basis-full sm:basis-1/2 md:basis-1/3"
              initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
              whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: (slotIdx % n) * 0.08, duration: 0.4, ease: 'easeOut' }}
            >
              <Card item={items[realIdx]} locale={locale} isRtl={isRtl} />
            </motion.div>
          ))}
        </div>
      </div>

      {n > 1 && (
        // dir="ltr" so button order doesn't flip under the page's inherited RTL direction —
        // the track above is fixed-LTR internally, so controls must match.
        <div className="mt-8 flex items-center justify-center gap-4" dir="ltr">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={!canPrev}
            aria-label={t('carouselPrev')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-text-muted hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToReal(i)}
                aria-label={t('carouselDot', { index: i + 1 })}
                aria-current={i === currentReal ? 'true' : undefined}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === currentReal ? 'w-5 bg-primary' : 'w-2 bg-border hover:bg-primary/50'
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
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}
