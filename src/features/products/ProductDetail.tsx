'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { ShoppingBag, Heart, Minus, Plus, Check, MessageSquareQuote } from 'lucide-react'
import { calculatePrice, PricingError, getStartingPrice } from '@/shared/pricing'
import type { VariantTier, PricingRule, PriceResult } from '@/shared/pricing'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useUiStore } from '@/stores/uiStore'
import { ShareButton } from '@/components/ShareButton'
import { ImageGallery } from './ImageGallery'
import { ProductCard } from './ProductCard'
import { PriceOfferModal } from './PriceOfferModal'
import { ReviewsSection } from '@/features/reviews/ReviewsSection'
import type { ProductDTO, ProductVariantDTO, PublicReviewDTO } from '@/shared/types'

interface ProductDetailProps {
  product: ProductDTO
  relatedProducts: ProductDTO[]
  reviews: PublicReviewDTO[]
  locale: string
  /** When false, hides all purchase controls and shows a static "starting from" price instead. */
  purchasingEnabled: boolean
}

function formatPrice(agorot: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(agorot / 100)
}

export function ProductDetail({
  product,
  relatedProducts,
  reviews,
  locale,
  purchasingEnabled,
}: ProductDetailProps) {
  const t = useTranslations('product')
  const { addItem } = useCartStore()
  const { toggle, has } = useWishlistStore()
  const { a11y, addToast } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  // ── State ─────────────────────────────────────────────────────────────────────
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.variants[0]?.id ?? null
  )
  const [isCustom, setIsCustom] = useState(false)
  const [customWidth, setCustomWidth] = useState('')
  const [customHeight, setCustomHeight] = useState('')
  const [customDepth, setCustomDepth] = useState('')
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    product.colorOptions[0]?.id ?? null
  )
  const [quantity, setQuantity] = useState(1)
  const [addedFeedback, setAddedFeedback] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [stickyVisible, setStickyVisible] = useState(false)
  const ctaRef = useRef<HTMLButtonElement>(null)

  // ── Sticky bar via IntersectionObserver ───────────────────────────────────────
  useEffect(() => {
    if (!purchasingEnabled) return
    const el = ctaRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting), {
      threshold: 0,
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [purchasingEnabled])

  // ── Pricing engine call ───────────────────────────────────────────────────────
  const { priceResult, priceError } = useMemo<{
    priceResult: PriceResult | null
    priceError: string | null
  }>(() => {
    // Build engine-compatible arrays (convert ₪ → agorot)
    const variantsForEngine: VariantTier[] = product.variants.map((v) => ({
      id: v.id,
      price: Math.round(v.price * 100),
      width: v.width,
      height: v.height,
      depth: v.depth,
      diameter: v.diameter,
    }))

    const ruleForEngine: PricingRule | null = product.customPricingRule
      ? {
          basedOnVariantId: product.customPricingRule.basedOnVariantId,
          pricePerCmWidth:
            product.customPricingRule.pricePerCmWidth != null
              ? Math.round(product.customPricingRule.pricePerCmWidth * 100)
              : undefined,
          pricePerCmHeight:
            product.customPricingRule.pricePerCmHeight != null
              ? Math.round(product.customPricingRule.pricePerCmHeight * 100)
              : undefined,
          pricePerCmDepth:
            product.customPricingRule.pricePerCmDepth != null
              ? Math.round(product.customPricingRule.pricePerCmDepth * 100)
              : undefined,
          pricePerCmDiameter:
            product.customPricingRule.pricePerCmDiameter != null
              ? Math.round(product.customPricingRule.pricePerCmDiameter * 100)
              : undefined,
          minWidth: product.customPricingRule.minWidth,
          maxWidth: product.customPricingRule.maxWidth,
          minHeight: product.customPricingRule.minHeight,
          maxHeight: product.customPricingRule.maxHeight,
          minDepth: product.customPricingRule.minDepth,
          maxDepth: product.customPricingRule.maxDepth,
        }
      : null

    try {
      if (isCustom) {
        const w = customWidth !== '' ? parseFloat(customWidth) : undefined
        const h = customHeight !== '' ? parseFloat(customHeight) : undefined
        const d = customDepth !== '' ? parseFloat(customDepth) : undefined

        // If no dimension entered yet, show the hint text (not an error)
        if (w === undefined && h === undefined && d === undefined) {
          return { priceResult: null, priceError: null }
        }

        const result = calculatePrice(
          { customizable: product.customizable },
          variantsForEngine,
          ruleForEngine,
          { custom: { width: w, height: h, depth: d }, quantity }
        )
        return { priceResult: result, priceError: null }
      } else {
        // No variant selected and no variants exist → fall back to basePrice display
        if (!selectedVariantId) {
          if (product.variants.length === 0) {
            // Synthesise a result from basePrice
            const basePriceAgorot = Math.round(product.basePrice * 100)
            return {
              priceResult: {
                unitPrice: basePriceAgorot,
                totalPrice: basePriceAgorot * quantity,
                surchargeBreakdown: {
                  base: basePriceAgorot,
                  width: 0,
                  height: 0,
                  depth: 0,
                  diameter: 0,
                },
              },
              priceError: null,
            }
          }
          return { priceResult: null, priceError: null }
        }

        const result = calculatePrice(
          { customizable: product.customizable },
          variantsForEngine,
          ruleForEngine,
          { variantId: selectedVariantId, quantity }
        )
        return { priceResult: result, priceError: null }
      }
    } catch (err) {
      if (err instanceof PricingError) {
        const dim =
          err.dimension === 'width'
            ? t('dimensionWidth')
            : err.dimension === 'height'
              ? t('dimensionHeight')
              : t('dimensionDepth')
        const msgKey = err.bound === 'min' ? 'priceErrorMin' : 'priceErrorMax'
        return {
          priceResult: null,
          priceError: t(msgKey, { dimension: dim, value: err.value, limit: err.limit }),
        }
      }
      return { priceResult: null, priceError: t('priceErrorGeneral') }
    }
  }, [product, isCustom, selectedVariantId, customWidth, customHeight, customDepth, quantity, t])

  // ── Derived values ────────────────────────────────────────────────────────────
  const productName = locale === 'he' ? product.name_he : product.name_en
  const productDesc = locale === 'he' ? product.description_he : product.description_en
  const isWishlisted = has(product.id)

  function variantLabel(v: ProductVariantDTO): string {
    const name = locale === 'he' ? v.name_he : v.name_en
    const dims = [
      v.width != null ? `${v.width}` : null,
      v.height != null ? `${v.height}` : null,
      v.depth != null ? `${v.depth}` : null,
    ].filter(Boolean)
    if (dims.length === 0) return name
    return `${name} — ${dims.join('×')} ${t('cm')}`
  }

  // ── Add to cart ───────────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(() => {
    if (!priceResult) return
    const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0]
    const selectedVariant = product.variants.find((v) => v.id === selectedVariantId)

    addItem({
      id: crypto.randomUUID(),
      productId: product.id,
      productSlug: product.slug,
      name_he: product.name_he,
      name_en: product.name_en,
      imageUrl: primaryImage?.url,
      variantId: isCustom ? undefined : (selectedVariantId ?? undefined),
      variantName: isCustom
        ? undefined
        : selectedVariant
          ? locale === 'he'
            ? selectedVariant.name_he
            : selectedVariant.name_en
          : undefined,
      isCustom,
      customWidth: isCustom && customWidth !== '' ? parseFloat(customWidth) : undefined,
      customHeight: isCustom && customHeight !== '' ? parseFloat(customHeight) : undefined,
      customDepth: isCustom && customDepth !== '' ? parseFloat(customDepth) : undefined,
      selectedColorId: selectedColorId ?? undefined,
      quantity,
      unitPrice: priceResult.unitPrice,
      totalPrice: priceResult.totalPrice,
    })

    addToast({
      type: 'success',
      message: locale === 'he' ? `${product.name_he} נוסף לסל` : `${product.name_en} added to cart`,
    })

    setAddedFeedback(true)
    setTimeout(() => setAddedFeedback(false), 2000)
  }, [
    priceResult,
    product,
    selectedVariantId,
    isCustom,
    customWidth,
    customHeight,
    customDepth,
    selectedColorId,
    quantity,
    locale,
    addItem,
    addToast,
  ])

  const canAddToCart = !!priceResult && !priceError

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <article className="min-h-screen bg-bg py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Main product area: gallery + buy-box */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* LEFT: Image Gallery */}
          <div>
            <ImageGallery images={product.images} productName={productName} locale={locale} />
          </div>

          {/* RIGHT: Buy Box */}
          <div className="flex flex-col gap-6">
            {/* Category badge + name */}
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-accent bg-accent/10 rounded-full px-3 py-1">
                {locale === 'he' ? product.category.name_he : product.category.name_en}
              </span>
              <h1 className="mt-3 text-3xl font-bold text-text-main leading-snug">{productName}</h1>
            </div>

            {purchasingEnabled ? (
              <>
                {/* Live price display */}
                <div className="bg-secondary rounded-xl p-4 border border-border min-h-[72px] flex items-center">
                  <AnimatePresence mode="wait">
                    {priceResult ? (
                      <motion.div
                        key="price"
                        className="flex items-baseline gap-2 flex-wrap"
                        initial={shouldAnimate ? { opacity: 0, y: 4 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={shouldAnimate ? { opacity: 0, y: -4 } : undefined}
                        transition={{ duration: 0.15 }}
                      >
                        <span className="text-3xl font-bold text-primary tabular-nums">
                          {formatPrice(priceResult.unitPrice, locale)}
                        </span>
                        {quantity > 1 && (
                          <span className="text-sm text-text-muted">
                            × {quantity} ={' '}
                            <span className="font-semibold text-text-main tabular-nums">
                              {formatPrice(priceResult.totalPrice, locale)}
                            </span>
                          </span>
                        )}
                        {isCustom && (
                          <span className="text-xs text-text-muted">{t('estimatedPrice')}</span>
                        )}
                      </motion.div>
                    ) : priceError ? (
                      <motion.p
                        key="error"
                        className="text-sm text-accent"
                        role="alert"
                        aria-live="polite"
                        initial={shouldAnimate ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        exit={shouldAnimate ? { opacity: 0 } : undefined}
                        transition={{ duration: 0.15 }}
                      >
                        {priceError}
                      </motion.p>
                    ) : (
                      <motion.p
                        key="placeholder"
                        className="text-sm text-text-muted"
                        initial={shouldAnimate ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        exit={shouldAnimate ? { opacity: 0 } : undefined}
                        transition={{ duration: 0.15 }}
                      >
                        {isCustom ? t('enterDimensions') : null}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Standard variant selector */}
                {product.variants.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-text-main mb-2">
                      {t('standardSizes')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => {
                        const isSelected = !isCustom && selectedVariantId === v.id
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                              setSelectedVariantId(v.id)
                              setIsCustom(false)
                            }}
                            disabled={isCustom}
                            aria-pressed={isSelected}
                            className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                              isSelected
                                ? 'bg-primary border-primary text-surface'
                                : 'bg-surface border-border text-text-main hover:border-primary hover:text-primary'
                            }`}
                          >
                            {variantLabel(v)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Custom dimensions section — only if product.customizable */}
                {product.customizable && (
                  <div className="border border-border rounded-xl p-4 flex flex-col gap-4">
                    {/* Toggle row */}
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-text-main">
                        {t('customDimensionsToggle')}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isCustom}
                        onClick={() => setIsCustom((v) => !v)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault()
                            setIsCustom((v) => !v)
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border-2 transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                          isCustom ? 'bg-primary border-primary' : 'bg-secondary border-border'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-surface shadow-sm transition-transform duration-200 ${
                            isCustom ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Dimension inputs — animated reveal */}
                    <AnimatePresence>
                      {isCustom && (
                        <motion.div
                          initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-3 gap-3 pt-2">
                            {/* Width */}
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor="dim-width"
                                className="text-xs font-medium text-text-muted"
                              >
                                {t('width')}
                              </label>
                              <input
                                id="dim-width"
                                type="number"
                                inputMode="decimal"
                                min={product.customPricingRule?.minWidth}
                                max={product.customPricingRule?.maxWidth}
                                value={customWidth}
                                onChange={(e) => setCustomWidth(e.target.value)}
                                placeholder="—"
                                className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main focus:outline focus:outline-2 focus:outline-primary w-full"
                              />
                              {product.customPricingRule?.minWidth != null && (
                                <span className="text-xs text-text-muted">
                                  {t('minHint', { min: product.customPricingRule.minWidth })}
                                </span>
                              )}
                              {product.customPricingRule?.maxWidth != null && (
                                <span className="text-xs text-text-muted">
                                  {t('maxHint', { max: product.customPricingRule.maxWidth })}
                                </span>
                              )}
                            </div>

                            {/* Height */}
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor="dim-height"
                                className="text-xs font-medium text-text-muted"
                              >
                                {t('height')}
                              </label>
                              <input
                                id="dim-height"
                                type="number"
                                inputMode="decimal"
                                min={product.customPricingRule?.minHeight}
                                max={product.customPricingRule?.maxHeight}
                                value={customHeight}
                                onChange={(e) => setCustomHeight(e.target.value)}
                                placeholder="—"
                                className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main focus:outline focus:outline-2 focus:outline-primary w-full"
                              />
                              {product.customPricingRule?.minHeight != null && (
                                <span className="text-xs text-text-muted">
                                  {t('minHint', { min: product.customPricingRule.minHeight })}
                                </span>
                              )}
                              {product.customPricingRule?.maxHeight != null && (
                                <span className="text-xs text-text-muted">
                                  {t('maxHint', { max: product.customPricingRule.maxHeight })}
                                </span>
                              )}
                            </div>

                            {/* Depth */}
                            <div className="flex flex-col gap-1">
                              <label
                                htmlFor="dim-depth"
                                className="text-xs font-medium text-text-muted"
                              >
                                {t('depth')}
                              </label>
                              <input
                                id="dim-depth"
                                type="number"
                                inputMode="decimal"
                                min={product.customPricingRule?.minDepth}
                                max={product.customPricingRule?.maxDepth}
                                value={customDepth}
                                onChange={(e) => setCustomDepth(e.target.value)}
                                placeholder="—"
                                className="min-h-[44px] rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main focus:outline focus:outline-2 focus:outline-primary w-full"
                              />
                              {product.customPricingRule?.minDepth != null && (
                                <span className="text-xs text-text-muted">
                                  {t('minHint', { min: product.customPricingRule.minDepth })}
                                </span>
                              )}
                              {product.customPricingRule?.maxDepth != null && (
                                <span className="text-xs text-text-muted">
                                  {t('maxHint', { max: product.customPricingRule.maxDepth })}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Color swatches */}
                {product.colorOptions.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-text-main mb-2">{t('colorLabel')}</p>
                    <div className="flex flex-wrap gap-2">
                      {product.colorOptions.map((color) => {
                        const colorName = locale === 'he' ? color.name_he : color.name_en
                        const isSelected = selectedColorId === color.id
                        return (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setSelectedColorId(color.id)}
                            aria-label={colorName}
                            aria-pressed={isSelected}
                            title={colorName}
                            className={`w-9 h-9 rounded-full cursor-pointer overflow-hidden transition-all duration-150 ring-offset-2 ${
                              isSelected
                                ? 'ring-2 ring-primary scale-110'
                                : 'ring-1 ring-border hover:ring-primary hover:scale-105'
                            }`}
                            style={color.imageUrl ? undefined : { backgroundColor: color.hexCode }}
                          >
                            {color.imageUrl && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={color.imageUrl}
                                alt=""
                                aria-hidden="true"
                                className="h-full w-full object-cover"
                              />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity stepper */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-text-main">{t('quantity')}</span>
                  <div className="flex items-center border border-border rounded-full overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label={t('decreaseQuantity')}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-text-main hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <span
                      className="w-10 text-center text-sm font-semibold text-text-main tabular-nums"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      disabled={quantity >= 99}
                      aria-label={t('increaseQuantity')}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center text-text-main hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart + Wishlist */}
                <div className="flex gap-3">
                  <button
                    ref={ctaRef}
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!canAddToCart}
                    className={`flex-1 flex items-center justify-center gap-2 min-h-[52px] rounded-full font-semibold text-base transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      addedFeedback
                        ? 'bg-green-600 text-surface'
                        : 'bg-primary hover:opacity-90 text-surface'
                    }`}
                  >
                    {addedFeedback ? (
                      <Check size={20} aria-hidden="true" />
                    ) : (
                      <ShoppingBag size={20} aria-hidden="true" />
                    )}
                    {addedFeedback ? t('addedToCart') : t('addToCart')}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggle(product.id)}
                    aria-label={isWishlisted ? t('wishlistRemove') : t('wishlistAdd')}
                    aria-pressed={isWishlisted}
                    className="flex min-h-[52px] min-w-[52px] items-center justify-center rounded-full border border-border bg-surface hover:bg-secondary transition-colors duration-150 cursor-pointer"
                  >
                    <Heart
                      size={22}
                      aria-hidden="true"
                      className={isWishlisted ? 'fill-current text-accent' : 'text-text-muted'}
                    />
                  </button>

                  <ShareButton title={productName} text={productDesc || undefined} />
                </div>

                {/* Request a price offer */}
                <button
                  type="button"
                  onClick={() => setOfferOpen(true)}
                  className="flex items-center justify-center gap-2 min-h-[48px] rounded-full border border-primary text-primary font-semibold text-sm hover:bg-primary/5 transition-colors duration-150 cursor-pointer"
                >
                  <MessageSquareQuote size={18} aria-hidden="true" />
                  {t('priceOffer.button')}
                </button>
              </>
            ) : (
              <>
                {/* Static starting price */}
                <div className="bg-secondary rounded-xl p-4 border border-border min-h-[72px] flex items-center">
                  <span className="text-3xl font-bold text-primary tabular-nums">
                    {t('startingFrom')}
                    {formatPrice(Math.round(getStartingPrice(product) * 100), locale)}
                  </span>
                </div>

                {/* Wishlist + Share — no purchase actions in showcase mode */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(product.id)}
                    aria-label={isWishlisted ? t('wishlistRemove') : t('wishlistAdd')}
                    aria-pressed={isWishlisted}
                    className="flex min-h-[52px] min-w-[52px] items-center justify-center rounded-full border border-border bg-surface hover:bg-secondary transition-colors duration-150 cursor-pointer"
                  >
                    <Heart
                      size={22}
                      aria-hidden="true"
                      className={isWishlisted ? 'fill-current text-accent' : 'text-text-muted'}
                    />
                  </button>

                  <ShareButton title={productName} text={productDesc || undefined} />
                </div>

                {/* Request a price offer — the main action while purchasing is off */}
                <button
                  type="button"
                  onClick={() => setOfferOpen(true)}
                  className="flex items-center justify-center gap-2 min-h-[52px] rounded-full bg-primary text-surface font-semibold text-base hover:opacity-90 transition-opacity duration-150 cursor-pointer"
                >
                  <MessageSquareQuote size={20} aria-hidden="true" />
                  {t('priceOffer.button')}
                </button>
              </>
            )}

            {/* Description */}
            {productDesc && (
              <p className="text-sm leading-relaxed text-text-muted border-t border-border pt-4">
                {productDesc}
              </p>
            )}
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16 md:mt-24">
            <h2 className="text-2xl font-bold text-text-main mb-6">{t('relatedProducts')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} locale={locale} />
              ))}
            </div>
          </section>
        )}

        {/* Reviews */}
        <ReviewsSection reviews={reviews} productId={product.id} locale={locale} />
      </div>

      {/* Price offer request dialog */}
      <PriceOfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        product={product}
        locale={locale}
        selection={{
          variantId: selectedVariantId,
          isCustom,
          customWidth: isCustom && customWidth !== '' ? parseFloat(customWidth) : undefined,
          customHeight: isCustom && customHeight !== '' ? parseFloat(customHeight) : undefined,
          customDepth: isCustom && customDepth !== '' ? parseFloat(customDepth) : undefined,
          colorId: selectedColorId,
          quantity,
        }}
        estimatedPrice={
          purchasingEnabled && priceResult ? formatPrice(priceResult.totalPrice, locale) : undefined
        }
      />

      {/* Sticky mobile add-to-cart bar */}
      <AnimatePresence>
        {purchasingEnabled && stickyVisible && (
          <motion.div
            initial={shouldAnimate ? { y: 100, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={shouldAnimate ? { y: 100, opacity: 0 } : undefined}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed bottom-0 start-0 end-0 z-40 md:hidden bg-surface/95 backdrop-blur-md border-t border-border shadow-lg px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-main truncate">{productName}</p>
                {priceResult && (
                  <p className="text-base font-bold text-primary tabular-nums">
                    {formatPrice(priceResult.unitPrice, locale)}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                className="flex items-center gap-2 min-h-[44px] rounded-full bg-primary hover:opacity-90 text-surface px-5 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag size={18} aria-hidden="true" />
                {t('addToCart')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}
