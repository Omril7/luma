'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ArrowLeftRight, Check, Minus, Plus, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { api } from '@/lib/api'
import { useCompareStore, MAX_COMPARE_ITEMS } from '@/stores/compareStore'
import { getStartingPrice } from '@/shared/pricing'
import type { ProductDTO, ProductVariantDTO } from '@/shared/types'

interface CompareClientProps {
  locale: string
}

function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(price)
}

export function CompareClient({ locale }: CompareClientProps) {
  const t = useTranslations('compare')
  const tProduct = useTranslations('product')
  const tCommon = useTranslations('common')
  const ids = useCompareStore((s) => s.ids)
  const { remove } = useCompareStore()

  const [mounted, setMounted] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const cacheRef = useRef<Map<string, ProductDTO>>(new Map())

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const missing = ids.filter((id) => !cacheRef.current.has(id))
    if (missing.length === 0) {
      setLoaded(true)
      return
    }

    let cancelled = false
    setError(false)
    api
      .get<{ products: ProductDTO[] }>(`/api/products?ids=${ids.join(',')}`)
      .then((res) => {
        if (cancelled) return
        for (const p of res.products) cacheRef.current.set(p.id, p)
        // Prune ids the server no longer returns (deleted / deactivated products)
        const returned = new Set(res.products.map((p) => p.id))
        for (const id of ids) if (!returned.has(id)) remove(id)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoaded(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [mounted, ids, remove, retryCount])

  const products = ids.flatMap((id) => {
    const p = cacheRef.current.get(id)
    return p ? [p] : []
  })

  function name(p: ProductDTO): string {
    return locale === 'he' ? p.name_he : p.name_en
  }

  function variantLabel(v: ProductVariantDTO): string {
    const vName = locale === 'he' ? v.name_he : v.name_en
    const dims = [v.width, v.height, v.depth].filter((d) => d != null)
    if (v.diameter != null) {
      return `${vName} — ⌀${v.diameter} ${tProduct('cm')}`
    }
    if (dims.length === 0) return vName
    return `${vName} — ${dims.join('×')} ${tProduct('cm')}`
  }

  const showSkeleton = !mounted || (!loaded && ids.length > 0)

  return (
    <div className="min-h-screen bg-bg py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h1 className="mb-6 text-3xl font-bold text-text-main">{t('title')}</h1>

        {showSkeleton ? (
          <SkeletonTable />
        ) : error ? (
          <ErrorState onRetry={() => setRetryCount((n) => n + 1)} t={t} />
        ) : products.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <td className="sticky start-0 z-10 min-w-28 bg-surface p-3 md:min-w-36" />
                  {products.map((p) => (
                    <th
                      key={p.id}
                      scope="col"
                      className="min-w-44 border-s border-border p-3 text-start align-top font-normal md:min-w-56"
                    >
                      <ProductHeaderCell
                        product={p}
                        locale={locale}
                        onRemove={() => remove(p.id)}
                        removeLabel={t('removeProduct', { name: name(p) })}
                      />
                    </th>
                  ))}
                  {products.length < MAX_COMPARE_ITEMS && (
                    <td className="min-w-44 border-s border-border p-3 align-top md:min-w-56">
                      <Link
                        href="/shop"
                        className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-text-muted transition-colors duration-150 hover:border-primary hover:text-primary"
                      >
                        <Plus size={24} aria-hidden="true" />
                        <span className="text-sm font-medium">{t('addSlot')}</span>
                      </Link>
                    </td>
                  )}
                </tr>
              </thead>
              <tbody>
                <CompareRow
                  label={t('priceRow')}
                  products={products}
                  extraCol={products.length < MAX_COMPARE_ITEMS}
                >
                  {(p) => (
                    <span className="font-semibold text-primary tabular-nums">
                      {tProduct('fromPrice')}
                      {formatPrice(getStartingPrice(p), locale)}
                    </span>
                  )}
                </CompareRow>

                <CompareRow
                  label={t('categoryRow')}
                  products={products}
                  extraCol={products.length < MAX_COMPARE_ITEMS}
                >
                  {(p) => (locale === 'he' ? p.category.name_he : p.category.name_en)}
                </CompareRow>

                <CompareRow
                  label={t('sizesRow')}
                  products={products}
                  extraCol={products.length < MAX_COMPARE_ITEMS}
                >
                  {(p) =>
                    p.variants.length > 0 ? (
                      <ul className="flex flex-col gap-1">
                        {p.variants.map((v) => (
                          <li key={v.id}>{variantLabel(v)}</li>
                        ))}
                      </ul>
                    ) : (
                      <NoValue />
                    )
                  }
                </CompareRow>

                <CompareRow
                  label={t('customRow')}
                  products={products}
                  extraCol={products.length < MAX_COMPARE_ITEMS}
                >
                  {(p) =>
                    p.customizable ? (
                      <span className="inline-flex items-center gap-1.5 text-primary">
                        <Check size={16} aria-hidden="true" />
                        {tCommon('yes')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-text-muted">
                        <Minus size={16} aria-hidden="true" />
                        {tCommon('no')}
                      </span>
                    )
                  }
                </CompareRow>

                <CompareRow
                  label={t('colorsRow')}
                  products={products}
                  extraCol={products.length < MAX_COMPARE_ITEMS}
                >
                  {(p) =>
                    p.colorOptions.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {p.colorOptions.map((c) => {
                          const cName = locale === 'he' ? c.name_he : c.name_en
                          return c.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={c.id}
                              src={c.imageUrl}
                              alt={cName}
                              title={cName}
                              className="h-6 w-6 rounded-full border border-border object-cover"
                            />
                          ) : (
                            <span
                              key={c.id}
                              title={cName}
                              role="img"
                              aria-label={cName}
                              className="h-6 w-6 rounded-full border border-border"
                              style={{ backgroundColor: c.hexCode }}
                            />
                          )
                        })}
                      </div>
                    ) : (
                      <NoValue />
                    )
                  }
                </CompareRow>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Product column header (image + name + remove) ──────────────────────────────
function ProductHeaderCell({
  product,
  locale,
  onRemove,
  removeLabel,
}: {
  product: ProductDTO
  locale: string
  onRemove: () => void
  removeLabel: string
}) {
  const productName = locale === 'he' ? product.name_he : product.name_en
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0]

  return (
    <div className="relative flex flex-col gap-2">
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="absolute top-1 end-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface/80 text-text-muted backdrop-blur-sm transition-colors duration-150 hover:bg-surface hover:text-text-main cursor-pointer"
      >
        <X size={16} aria-hidden="true" />
      </button>
      <Link href={`/product/${product.slug}`} className="group flex flex-col gap-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary">
          {primaryImage && (
            <Image
              src={primaryImage.url}
              alt={locale === 'he' ? primaryImage.altText_he : primaryImage.altText_en}
              fill
              sizes="(max-width: 768px) 60vw, 25vw"
              className="object-cover"
            />
          )}
        </div>
        <span className="text-base font-semibold text-text-main group-hover:text-primary transition-colors duration-150">
          {productName}
        </span>
      </Link>
    </div>
  )
}

// ── Generic comparison row ─────────────────────────────────────────────────────
function CompareRow({
  label,
  products,
  extraCol,
  children,
}: {
  label: string
  products: ProductDTO[]
  extraCol: boolean
  children: (p: ProductDTO) => React.ReactNode
}) {
  return (
    <tr className="border-t border-border">
      <th
        scope="row"
        className="sticky start-0 z-10 bg-surface p-3 text-start align-top text-xs font-semibold uppercase tracking-wide text-text-muted"
      >
        {label}
      </th>
      {products.map((p) => (
        <td key={p.id} className="border-s border-border p-3 align-top text-text-main">
          {children(p)}
        </td>
      ))}
      {extraCol && <td className="border-s border-border p-3" />}
    </tr>
  )
}

function NoValue() {
  return (
    <span className="text-text-muted" aria-hidden="true">
      —
    </span>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function SkeletonTable() {
  return (
    <div
      className="animate-pulse overflow-hidden rounded-lg border border-border bg-surface p-4"
      aria-hidden="true"
    >
      <div className="flex gap-4">
        <div className="w-28 shrink-0 md:w-36" />
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col gap-3">
            <div className="aspect-[4/3] rounded-lg bg-secondary" />
            <div className="h-4 w-3/4 rounded bg-secondary" />
            <div className="h-4 w-1/3 rounded bg-secondary" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ t }: { t: ReturnType<typeof useTranslations<'compare'>> }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
        <ArrowLeftRight size={40} aria-hidden="true" className="text-border" strokeWidth={1.5} />
      </span>
      <h2 className="text-xl font-semibold text-text-main">{t('empty.heading')}</h2>
      <p className="max-w-xs text-text-muted">{t('empty.body', { max: MAX_COMPARE_ITEMS })}</p>
      <Link
        href="/shop"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary/90"
      >
        {t('empty.cta')}
      </Link>
    </div>
  )
}

// ── Error state ────────────────────────────────────────────────────────────────
function ErrorState({
  onRetry,
  t,
}: {
  onRetry: () => void
  t: ReturnType<typeof useTranslations<'compare'>>
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <h2 className="text-xl font-semibold text-text-main">{t('error')}</h2>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-surface transition-colors hover:bg-primary/90 cursor-pointer"
      >
        {t('retry')}
      </button>
    </div>
  )
}
