'use client'

import Image from 'next/image'
import { ArrowLeftRight, Heart } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useCompareStore, MAX_COMPARE_ITEMS } from '@/stores/compareStore'
import { useUiStore } from '@/stores/uiStore'
import { getStartingPrice } from '@/shared/pricing'
import type { ProductDTO } from '@/shared/types'

interface ProductCardProps {
  product: ProductDTO
  locale: string
}

function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(price)
}

export function ProductCard({ product, locale }: ProductCardProps) {
  const t = useTranslations()
  const { toggle, has } = useWishlistStore()
  const compareIds = useCompareStore((s) => s.ids)
  const { toggle: toggleCompare, has: hasCompare } = useCompareStore()
  const { a11y, addToast } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const isWishlisted = has(product.id)
  const isCompared = hasCompare(product.id)
  const productName = locale === 'he' ? product.name_he : product.name_en
  const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0]
  const price = getStartingPrice(product)
  const priceLabel = `${t('home.featured.from')}${formatPrice(price, locale)}`

  function handleWishlistClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    toggle(product.id)
  }

  function handleCompareClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!isCompared && compareIds.length >= MAX_COMPARE_ITEMS) {
      addToast({ type: 'info', message: t('compare.maxReached', { max: MAX_COMPARE_ITEMS }) })
      return
    }
    toggleCompare(product.id)
  }

  return (
    <motion.article
      className="relative cursor-pointer bg-surface rounded-lg border border-border overflow-hidden"
      whileHover={shouldAnimate ? { y: -4, boxShadow: 'var(--shadow-soft)' } : undefined}
      whileTap={shouldAnimate ? { scale: 0.98 } : undefined}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <Link href={`/product/${product.slug}`} className="block">
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg bg-secondary">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={locale === 'he' ? primaryImage.altText_he : primaryImage.altText_en}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary">
              <svg
                aria-hidden="true"
                className="h-12 w-12 text-border"
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
          )}
        </div>

        {/* Content */}
        <div className="p-3 md:p-4">
          <h3 className="font-semibold text-text-main text-sm md:text-base line-clamp-2">
            {productName}
          </h3>
          <p className="mt-1 text-sm font-medium text-primary">{priceLabel}</p>
        </div>
      </Link>

      {/* Wishlist button */}
      <button
        type="button"
        onClick={handleWishlistClick}
        aria-label={
          isWishlisted ? t('home.featured.wishlistRemove') : t('home.featured.wishlistAdd')
        }
        aria-pressed={isWishlisted}
        className="absolute top-2 end-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 backdrop-blur-sm border border-border cursor-pointer transition-colors duration-150 hover:bg-surface"
      >
        <Heart
          size={18}
          aria-hidden="true"
          className={isWishlisted ? 'fill-current text-accent' : 'text-text-muted'}
        />
      </button>

      {/* Compare button */}
      <button
        type="button"
        onClick={handleCompareClick}
        aria-label={isCompared ? t('compare.toggleRemove') : t('compare.toggleAdd')}
        aria-pressed={isCompared}
        className={[
          'absolute top-[52px] end-2 flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm border cursor-pointer transition-colors duration-150',
          isCompared
            ? 'bg-primary border-primary text-surface'
            : 'bg-surface/80 border-border text-text-muted hover:bg-surface',
        ].join(' ')}
      >
        <ArrowLeftRight size={18} aria-hidden="true" />
      </button>
    </motion.article>
  )
}
