'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { ProductCard } from '@/features/products/ProductCard'
import type { ProductDTO, CategoryDTO } from '@/shared/types'
import type { ProductSortKey } from '@/server/services/productService'

interface ShopClientProps {
  initialProducts: ProductDTO[]
  total: number
  totalPages: number
  currentPage: number
  currentCategory: string | undefined
  currentSort: ProductSortKey
  categories: CategoryDTO[]
  locale: string
}

const SORT_KEYS: ProductSortKey[] = ['newest', 'price_asc', 'price_desc', 'name_he']

export function ShopClient({
  initialProducts,
  total,
  totalPages,
  currentPage,
  currentCategory,
  currentSort,
  categories,
  locale,
}: ShopClientProps) {
  const t = useTranslations('shop')
  const router = useRouter()
  const pathname = usePathname()
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const products = initialProducts

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(window.location.search)
    if (value === null) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    if (key !== 'page') params.delete('page')
    const query = params.toString()
    router.push(`${pathname}${query ? `?${query}` : ''}`)
  }

  // ── Category pill component ──────────────────────────────────────────────────
  function CategoryPill({
    cat,
    vertical = false,
  }: {
    cat: CategoryDTO | null
    vertical?: boolean
  }) {
    const isActive = cat === null ? currentCategory === undefined : currentCategory === cat.id
    const label = cat === null ? t('allCategories') : locale === 'he' ? cat.name_he : cat.name_en

    return (
      <button
        type="button"
        onClick={() =>
          cat === null
            ? setParam('category', null)
            : setParam('category', currentCategory === cat.id ? null : cat.id)
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
      <label className={compact ? 'flex items-center gap-2' : 'flex flex-col gap-1'}>
        {!compact && (
          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {t('sortLabel')}
          </span>
        )}
        <select
          value={currentSort}
          onChange={(e) => setParam('sort', e.target.value)}
          aria-label={t('sortLabel')}
          className="rounded border border-border bg-surface ps-3 pe-8 py-2 text-sm text-text-main focus-visible:outline-2 cursor-pointer min-h-[44px]"
        >
          {SORT_KEYS.map((key) => (
            <option key={key} value={key}>
              {t(`sort.${key}`)}
            </option>
          ))}
        </select>
      </label>
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
            <div className="flex gap-3 items-center mb-6 lg:hidden">
              {/* Category pills — horizontally scrollable */}
              <div
                className="flex-1 flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: 'none' }}
              >
                <CategoryPill cat={null} />
                {categories.map((cat) => (
                  <CategoryPill key={cat.id} cat={cat} />
                ))}
              </div>

              {/* Compact sort */}
              <div className="flex-shrink-0">
                <SortSelect compact />
              </div>
            </div>

            {/* Results count */}
            <p className="text-sm text-text-muted mb-4">{t('results', { count: total })}</p>

            {/* Product grid */}
            {products.length > 0 ? (
              <motion.div layout className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
                <AnimatePresence mode="popLayout">
                  {products.map((product, i) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldAnimate ? { opacity: 0, y: -10 } : undefined}
                      transition={{
                        duration: 0.3,
                        delay: shouldAnimate ? i * 0.05 : 0,
                      }}
                    >
                      <ProductCard product={product} locale={locale} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <EmptyState onClear={() => setParam('category', null)} t={t} />
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setParam('page', String(currentPage - 1))}
                  disabled={currentPage === 1}
                  aria-label={t('prevPage')}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-border text-text-main transition-colors hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronDown size={18} aria-hidden="true" className="rotate-90 rtl:-rotate-90" />
                </button>

                <span className="text-sm text-text-muted">
                  {t('page', { page: currentPage, total: totalPages })}
                </span>

                <button
                  type="button"
                  onClick={() => setParam('page', String(currentPage + 1))}
                  disabled={currentPage === totalPages}
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
