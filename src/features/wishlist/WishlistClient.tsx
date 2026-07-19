'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { Heart, Share2, ShoppingBag } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { api } from '@/lib/api'
import { FEATURES } from '@/lib/featureFlags'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useCartStore } from '@/stores/cartStore'
import { useUiStore } from '@/stores/uiStore'
import { ProductCard } from '@/features/products/ProductCard'
import { ShareButton } from '@/components/ShareButton'
import type { ProductDTO } from '@/shared/types'

interface WishlistClientProps {
  locale: string
}

export function WishlistClient({ locale }: WishlistClientProps) {
  const t = useTranslations('wishlist')
  const router = useRouter()
  const pathname = usePathname()
  const ids = useWishlistStore((s) => s.ids)
  const { merge, remove } = useWishlistStore()
  const { addItem } = useCartStore()
  const { a11y, addToast } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const [mounted, setMounted] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const cacheRef = useRef<Map<string, ProductDTO>>(new Map())
  const restoredRef = useRef(false)

  // ── Restore a shared list from ?wishlist=<ids> (runs once, before fetching) ──
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true

    const param = new URLSearchParams(window.location.search).get('wishlist')
    if (param) {
      const shared = param
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
      if (shared.length > 0) {
        const known = useWishlistStore.getState().ids
        const hasNew = shared.some((id) => !known.includes(id))
        merge(shared)
        if (hasNew) addToast({ type: 'success', message: t('restored') })
      }
      router.replace(pathname, { scroll: false })
    }
    setMounted(true)
  }, [merge, addToast, t, router, pathname])

  // ── Fetch any products not yet loaded ─────────────────────────────────────────
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

  // ── Add to cart (cheapest variant / base price, like the card's "from ₪X") ────
  function handleAddToCart(product: ProductDTO) {
    const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0]
    const variant = product.variants[0] // API returns variants sorted by price asc
    const unitPrice = Math.round((variant ? variant.price : product.basePrice) * 100)
    const productName = locale === 'he' ? product.name_he : product.name_en

    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      productSlug: product.slug,
      name_he: product.name_he,
      name_en: product.name_en,
      imageUrl: primaryImage?.url,
      variantId: variant?.id,
      variantName: variant ? (locale === 'he' ? variant.name_he : variant.name_en) : undefined,
      isCustom: false,
      selectedColorId: product.colorOptions[0]?.id,
      quantity: 1,
      unitPrice,
      totalPrice: unitPrice,
    })
    addToast({ type: 'success', message: t('addedToCart', { name: productName }) })
  }

  const showSkeleton = !mounted || (!loaded && ids.length > 0)
  const shareUrl = mounted
    ? `${window.location.origin}${pathname}?wishlist=${ids.join(',')}`
    : undefined

  return (
    <div className="min-h-screen bg-bg py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Heading + share */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-main">{t('title')}</h1>
            {mounted && loaded && !error && ids.length > 0 && (
              <p className="mt-1 text-sm text-text-muted">{t('count', { count: ids.length })}</p>
            )}
          </div>

          {mounted && ids.length > 0 && (
            <ShareButton
              title={t('title')}
              url={shareUrl}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-border bg-surface px-5 text-sm font-semibold text-text-main transition-colors duration-150 hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Share2 size={18} aria-hidden="true" className="text-text-muted" />
              <span>{t('share')}</span>
            </ShareButton>
          )}
        </div>

        {/* Content */}
        {showSkeleton ? (
          <SkeletonGrid />
        ) : error ? (
          <ErrorState onRetry={() => setRetryCount((n) => n + 1)} t={t} />
        ) : products.length === 0 ? (
          <EmptyState t={t} />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={shouldAnimate ? { opacity: 0, scale: 0.95 } : undefined}
                  transition={{ duration: 0.3, delay: shouldAnimate ? Math.min(i, 8) * 0.05 : 0 }}
                  className="flex flex-col gap-2"
                >
                  <ProductCard product={product} locale={locale} />
                  {FEATURES.shop && (
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-surface transition-colors duration-150 hover:bg-primary/90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <ShoppingBag size={16} aria-hidden="true" />
                      <span>{t('addToCart')}</span>
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────────
function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-lg border border-border bg-surface"
        >
          <div className="aspect-[4/3] bg-secondary" />
          <div className="flex flex-col gap-2 p-3 md:p-4">
            <div className="h-4 w-3/4 rounded bg-secondary" />
            <div className="h-4 w-1/3 rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ t }: { t: ReturnType<typeof useTranslations<'wishlist'>> }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-secondary">
        <Heart size={40} aria-hidden="true" className="text-border" strokeWidth={1.5} />
      </span>
      <h2 className="text-xl font-semibold text-text-main">{t('empty.heading')}</h2>
      <p className="max-w-xs text-text-muted">{t('empty.body')}</p>
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
  t: ReturnType<typeof useTranslations<'wishlist'>>
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
