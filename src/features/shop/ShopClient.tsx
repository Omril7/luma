'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { Select } from '@/components/ui/Select'
import { ProductCard } from '@/features/products/ProductCard'
import { getStartingPrice } from '@/shared/pricing'
import type { ProductDTO, CategoryDTO } from '@/shared/types'

interface ShopClientProps {
  products: ProductDTO[]
  categories: CategoryDTO[]
  locale: string
}

// The sort keys offered in the /shop UI. `recommended` (the admin's drag order) is the
// default; `name_he` is the generic "name" option, sorted by the active locale's name.
const SORT_KEYS = ['recommended', 'newest', 'price_asc', 'price_desc', 'name_he'] as const
type ShopSortKey = (typeof SORT_KEYS)[number]

const PAGE_SIZE = 12

// Above this the entrance/layout animation is skipped (see the roadmap guard). The catalog
// is fetched with a hard cap well below this, so it's a safety net, not a real code path.
const ANIM_CAP = 150

function parseSort(raw: string | null): ShopSortKey {
  return (SORT_KEYS as readonly string[]).includes(raw ?? '') ? (raw as ShopSortKey) : 'recommended'
}

export function ShopClient({ products, categories, locale }: ShopClientProps) {
  const t = useTranslations('shop')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion && products.length <= ANIM_CAP

  // The route is static/ISR, so the server can't know the URL params — it renders the full
  // catalog in `recommended` order (good for SEO). On mount we read the query string and
  // apply any shared deep-link filter/sort/page. Subsequent changes are written back with
  // history.replaceState — no navigation, no server round-trip.
  const [category, setCategory] = useState<string | undefined>(undefined)
  const [sort, setSort] = useState<ShopSortKey>('recommended')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cat = params.get('category')
    if (cat && categories.some((c) => c.id === cat)) setCategory(cat)
    setSort(parseSort(params.get('sort')))
    const n = parseInt(params.get('page') ?? '1', 10)
    if (Number.isFinite(n) && n > 1) setPage(n)
    // Run once on mount — later state changes own the URL, not the reverse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Entrance stagger plays on first mount only; filter/sort/page changes get a plain
  // crossfade so the grid never unmounts to a skeleton or replays the cascade.
  const firstRender = useRef(true)
  const isFirstRender = firstRender.current
  firstRender.current = false

  const nameField = locale === 'he' ? 'name_he' : 'name_en'
  const collator = useMemo(
    () => new Intl.Collator(locale === 'he' ? 'he' : 'en', { sensitivity: 'base' }),
    [locale]
  )

  const filteredSorted = useMemo(() => {
    const list = category ? products.filter((p) => p.category.id === category) : products.slice()

    list.sort((a, b) => {
      switch (sort) {
        case 'price_asc':
          return getStartingPrice(a) - getStartingPrice(b)
        case 'price_desc':
          return getStartingPrice(b) - getStartingPrice(a)
        case 'newest':
          return b.createdAt.localeCompare(a.createdAt)
        case 'name_he':
          return collator.compare(a[nameField], b[nameField])
        case 'recommended':
        default:
          return a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt)
      }
    })
    return list
  }, [products, category, sort, collator, nameField])

  const total = filteredSorted.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filteredSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── URL sync (no navigation) ────────────────────────────────────────────────
  function writeUrl(next: { category?: string; sort?: ShopSortKey; page?: number }) {
    const params = new URLSearchParams(window.location.search)
    const cat = 'category' in next ? next.category : category
    const srt = 'sort' in next ? next.sort : sort
    const pg = 'page' in next ? next.page : page

    if (cat) params.set('category', cat)
    else params.delete('category')
    if (srt && srt !== 'recommended') params.set('sort', srt)
    else params.delete('sort')
    if (pg && pg > 1) params.set('page', String(pg))
    else params.delete('page')

    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  function selectCategory(next: string | undefined) {
    setCategory(next)
    setPage(1)
    writeUrl({ category: next, page: 1 })
  }

  function selectSort(next: ShopSortKey) {
    setSort(next)
    setPage(1)
    writeUrl({ sort: next, page: 1 })
  }

  function goToPage(next: number) {
    const clamped = Math.min(Math.max(1, next), totalPages)
    setPage(clamped)
    writeUrl({ page: clamped })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Category pill component ──────────────────────────────────────────────────
  function CategoryPill({
    cat,
    vertical = false,
  }: {
    cat: CategoryDTO | null
    vertical?: boolean
  }) {
    const isActive = cat === null ? category === undefined : category === cat.id
    const label = cat === null ? t('allCategories') : locale === 'he' ? cat.name_he : cat.name_en

    return (
      <button
        type="button"
        onClick={() =>
          cat === null
            ? selectCategory(undefined)
            : selectCategory(category === cat.id ? undefined : cat.id)
        }
        aria-pressed={isActive}
        className={[
          'inline-flex items-center whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer min-h-[44px]',
          vertical ? 'w-full justify-start' : '',
          isActive
            ? 'bg-primary border-primary text-surface'
            : 'bg-surface border-border text-text-main hover:bg-secondary hover:border-primary hover:text-primary',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {label}
      </button>
    )
  }

  // ── Sort select component ────────────────────────────────────────────────────
  function SortSelect({ compact = false }: { compact?: boolean }) {
    return (
      <div className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-1'}>
        {!compact && (
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t('sortLabel')}
          </span>
        )}
        <Select
          value={sort}
          onChange={(v) => selectSort(v as ShopSortKey)}
          options={SORT_KEYS.map((key) => ({ value: key, label: t(`sort.${key}`) }))}
          aria-label={t('sortLabel')}
          dir={locale === 'he' ? 'rtl' : 'ltr'}
          className={compact ? 'w-44' : 'w-full'}
          triggerClassName="min-h-[44px] bg-surface"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Page heading */}
        <h1 className="text-3xl font-bold text-text-main mb-6">{t('title')}</h1>

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex flex-col gap-6 w-56 flex-shrink-0">
            {/* Category filter */}
            <div className="flex flex-col gap-2">
              <CategoryPill cat={null} vertical />
              {categories.map((cat) => (
                <CategoryPill key={cat.id} cat={cat} vertical />
              ))}
            </div>

            {/* Sort */}
            <SortSelect />
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile filters */}
            <div className="flex flex-col gap-3 mb-6 lg:hidden">
              {/* Category pills — horizontally scrollable */}
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                <CategoryPill cat={null} />
                {categories.map((cat) => (
                  <CategoryPill key={cat.id} cat={cat} />
                ))}
              </div>

              {/* Compact sort */}
              <div className="flex-shrink-0 self-start">
                <SortSelect compact />
              </div>
            </div>

            {/* Results count */}
            <p className="text-sm text-text-muted mb-4" aria-live="polite">
              {t('results', { count: total })}
            </p>

            {/* Product grid */}
            {pageItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
                <AnimatePresence initial={false} mode="popLayout">
                  {pageItems.map((product, i) => (
                    <motion.div
                      key={product.id}
                      layout={shouldAnimate}
                      initial={shouldAnimate ? { opacity: 0, y: isFirstRender ? 20 : 0 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldAnimate ? { opacity: 0 } : undefined}
                      transition={{
                        duration: isFirstRender ? 0.3 : 0.15,
                        delay: shouldAnimate && isFirstRender ? i * 0.05 : 0,
                      }}
                    >
                      <ProductCard product={product} locale={locale} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <EmptyState onClear={() => selectCategory(undefined)} t={t} />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => goToPage(safePage - 1)}
                  disabled={safePage === 1}
                  aria-label={t('prevPage')}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border text-text-main transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronDown size={18} aria-hidden="true" className="rotate-90 rtl:-rotate-90" />
                </button>

                <span className="text-sm text-text-muted">
                  {t('page', { page: safePage, total: totalPages })}
                </span>

                <button
                  type="button"
                  onClick={() => goToPage(safePage + 1)}
                  disabled={safePage === totalPages}
                  aria-label={t('nextPage')}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border text-text-main transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronDown size={18} aria-hidden="true" className="-rotate-90 rtl:rotate-90" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({
  onClear,
  t,
}: {
  onClear: () => void
  t: ReturnType<typeof useTranslations<'shop'>>
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      {/* Furniture outline illustration */}
      <svg
        aria-hidden="true"
        className="w-24 h-24 text-border"
        fill="none"
        viewBox="0 0 96 96"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <rect x="12" y="24" width="72" height="48" rx="4" />
        <path d="M12 56h72" />
        <path d="M28 56v16M68 56v16" />
        <path d="M28 40h40" />
      </svg>

      <h2 className="text-xl font-semibold text-text-main">{t('empty.heading')}</h2>
      <p className="text-text-muted max-w-xs">{t('empty.body')}</p>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary/90 min-h-[44px] cursor-pointer"
      >
        {t('empty.cta')}
      </button>
    </div>
  )
}
