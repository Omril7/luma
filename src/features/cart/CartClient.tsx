'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Trash2, Minus, Plus, ShoppingCart, Tag, X, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useCartStore } from '@/stores/cartStore'
import { useUiStore } from '@/stores/uiStore'
import { api } from '@/lib/api'

interface CartClientProps {
  locale: string
}

function formatPrice(agorot: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(agorot / 100)
}

export function CartClient({ locale }: CartClientProps) {
  const t = useTranslations('cart')
  const { items, couponCode, discount, subtotal, total, updateQuantity, removeItem, setCoupon } =
    useCartStore()
  const { a11y, addToast } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const [couponInput, setCouponInput] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return
    setCouponLoading(true)
    setCouponError(null)
    try {
      const res = await api.post<{
        code: string
        discountAmount: number
        discountType: string
        discountValue: number
      }>('/api/coupons/validate', {
        code: couponInput.trim().toUpperCase(),
        subtotal: subtotal() / 100,
      })
      setCoupon(res.code, Math.round(res.discountAmount * 100))
      addToast({ type: 'success', message: t('couponApplied') })
      setCouponInput('')
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : String(err))
    } finally {
      setCouponLoading(false)
    }
  }

  function handleRemoveCoupon() {
    setCoupon(null, 0)
    setCouponError(null)
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <motion.div
          className="max-w-md w-full mx-auto py-24 flex flex-col items-center text-center gap-6"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {/* Cart outline SVG */}
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-secondary)]">
            <ShoppingCart
              size={48}
              strokeWidth={1.25}
              aria-hidden="true"
              className="text-[var(--color-text-muted)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('empty')}</h1>
            <p className="text-[var(--color-text-muted)] leading-relaxed">{t('emptyBody')}</p>
          </div>
          <Link
            href="/shop"
            className="inline-flex min-h-[48px] items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] px-8 font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            {t('continueShopping')}
          </Link>
        </motion.div>
      </div>
    )
  }

  // ── Non-empty cart ──────────────────────────────────────────────────────────
  const subtotalValue = subtotal()
  const totalValue = total()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        {/* Page heading */}
        <motion.div
          className="mb-8"
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <h1 className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">
            {t('title')}
            <span className="ms-2 text-base font-normal text-[var(--color-text-muted)]">
              {t('items', { count: items.length })}
            </span>
          </h1>
        </motion.div>

        {/* Two-column layout: items (2/3) + summary (1/3) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* ── Left: Items list + coupon ─────────────────────────────────── */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Items */}
            <ul className="flex flex-col gap-3" aria-label={t('title')}>
              <AnimatePresence initial={false}>
                {items.map((item) => {
                  const productName = locale === 'he' ? item.name_he : item.name_en

                  // Build dimension string for custom items
                  let dimsLabel: string | null = null
                  if (item.isCustom) {
                    const parts = [
                      item.customWidth != null ? `${item.customWidth}` : null,
                      item.customHeight != null ? `${item.customHeight}` : null,
                      item.customDepth != null ? `${item.customDepth}` : null,
                    ].filter(Boolean)
                    if (parts.length > 0) dimsLabel = `${parts.join('×')} cm`
                  }

                  return (
                    <motion.li
                      key={item.id}
                      layout={shouldAnimate}
                      initial={shouldAnimate ? { opacity: 0, x: 24 } : false}
                      animate={{ opacity: 1, x: 0 }}
                      exit={
                        shouldAnimate
                          ? { opacity: 0, x: 40, transition: { duration: 0.2 } }
                          : undefined
                      }
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                      className="flex gap-4 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]"
                    >
                      {/* Thumbnail */}
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[var(--radius)] bg-[var(--color-secondary)]">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={productName}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              aria-hidden="true"
                              className="h-8 w-8 text-[var(--color-border)]"
                              fill="none"
                              viewBox="0 0 48 48"
                              stroke="currentColor"
                              strokeWidth={1.25}
                            >
                              <rect x="6" y="10" width="36" height="28" rx="3" />
                              <path d="M6 30l10-10 8 8 6-6 12 8" />
                              <circle cx="16" cy="20" r="3" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info + controls */}
                      <div className="flex flex-1 flex-col gap-2 min-w-0">
                        {/* Name + remove */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--color-text)] leading-snug line-clamp-2">
                              {productName}
                            </p>
                            {/* Variant / custom label */}
                            {item.variantName && (
                              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                {item.variantName}
                              </p>
                            )}
                            {item.isCustom && (
                              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                                {locale === 'he' ? 'מותאם אישית' : 'Custom'}
                                {dimsLabel ? ` · ${dimsLabel}` : ''}
                              </p>
                            )}
                          </div>
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label={t('removeItem')}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors duration-150 hover:bg-[var(--color-secondary)] hover:text-[var(--color-accent)] cursor-pointer"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>

                        {/* Unit price + stepper + total */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          {/* Unit price */}
                          <p className="text-xs text-[var(--color-text-muted)]">
                            {formatPrice(item.unitPrice, locale)} <span>{t('unit')}</span>
                          </p>

                          {/* Quantity stepper */}
                          <div className="flex items-center overflow-hidden rounded-full border border-[var(--color-border)]">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, Math.max(1, item.quantity - 1))
                              }
                              disabled={item.quantity <= 1}
                              aria-label={t('decrease')}
                              className="flex h-9 w-9 items-center justify-center text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                            >
                              <Minus size={14} aria-hidden="true" />
                            </button>
                            <span
                              className="w-8 text-center text-sm font-semibold text-[var(--color-text)] tabular-nums"
                              aria-live="polite"
                              aria-atomic="true"
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, Math.min(99, item.quantity + 1))
                              }
                              disabled={item.quantity >= 99}
                              aria-label={t('increase')}
                              className="flex h-9 w-9 items-center justify-center text-[var(--color-text)] transition-colors duration-150 hover:bg-[var(--color-secondary)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                            >
                              <Plus size={14} aria-hidden="true" />
                            </button>
                          </div>

                          {/* Line total */}
                          <p className="font-semibold text-[var(--color-text)] tabular-nums">
                            {formatPrice(item.totalPrice, locale)}
                          </p>
                        </div>
                      </div>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ul>

            {/* ── Coupon section ─────────────────────────────────────────── */}
            <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              {couponCode ? (
                /* Applied coupon */
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Tag size={16} aria-hidden="true" className="text-[var(--color-primary)]" />
                    <span className="rounded-full bg-[var(--color-secondary)] px-3 py-1 text-sm font-semibold tracking-wide text-[var(--color-primary)]">
                      {couponCode}
                    </span>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      −{formatPrice(discount, locale)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="flex h-9 items-center gap-1.5 rounded-[var(--radius)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-text-muted)] transition-colors duration-150 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] cursor-pointer"
                  >
                    <X size={14} aria-hidden="true" />
                    {t('removeCoupon')}
                  </button>
                </div>
              ) : (
                /* Coupon input */
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value)
                        if (couponError) setCouponError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleApplyCoupon()
                      }}
                      placeholder={t('couponPlaceholder')}
                      style={{ textTransform: 'uppercase' }}
                      className="min-h-[44px] flex-1 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline focus:outline-2 focus:outline-[var(--color-primary)]"
                      aria-describedby={couponError ? 'coupon-error' : undefined}
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="flex min-h-[44px] items-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-5 font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {couponLoading ? (
                        <Loader2 size={16} aria-hidden="true" className="animate-spin" />
                      ) : null}
                      {t('apply')}
                    </button>
                  </div>
                  {couponError && (
                    <p
                      id="coupon-error"
                      role="alert"
                      className="text-sm text-[var(--color-accent)]"
                    >
                      {couponError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Order summary ──────────────────────────────────────── */}
          <motion.aside
            className="lg:col-span-1"
            initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: shouldAnimate ? 0.1 : 0 }}
          >
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
              {/* Summary rows */}
              <div className="flex flex-col gap-3">
                {/* Subtotal */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--color-text-muted)]">{t('subtotal')}</span>
                  <span className="text-sm font-medium text-[var(--color-text)] tabular-nums">
                    {formatPrice(subtotalValue, locale)}
                  </span>
                </div>

                {/* Shipping */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--color-text-muted)]">{t('shipping')}</span>
                  <span className="text-sm text-[var(--color-text-muted)] italic">
                    {t('shippingTbd')}
                  </span>
                </div>

                {/* Discount — only when active */}
                {discount > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--color-text-muted)]">{t('discount')}</span>
                    <span className="text-sm font-medium text-[var(--color-accent)] tabular-nums">
                      −{formatPrice(discount, locale)}
                    </span>
                  </div>
                )}

                {/* Divider */}
                <hr className="border-[var(--color-border)]" />

                {/* Total */}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--color-text)]">{t('total')}</span>
                  <span className="text-xl font-bold text-[var(--color-text)] tabular-nums">
                    {formatPrice(totalValue, locale)}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <Link
                href="/checkout"
                className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] px-6 py-3 text-center font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              >
                {t('checkout')}
              </Link>

              {/* Continue shopping */}
              <div className="mt-4 flex justify-center">
                <Link
                  href="/shop"
                  className="text-sm text-[var(--color-text-muted)] underline-offset-2 transition-colors duration-150 hover:text-[var(--color-text)] hover:underline"
                >
                  {t('continueShopping')}
                </Link>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}
