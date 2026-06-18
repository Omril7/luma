'use client'

import { CheckCircle2, Clock, Home, ShoppingBag } from 'lucide-react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUiStore } from '@/stores/uiStore'
import type { OrderDTO } from '@/shared/types'

interface ConfirmationClientProps {
  order: OrderDTO | null
  locale: string
}

// OrderDTO prices are decimal ₪ — multiply by 100 to get agorot for formatPrice
function formatPrice(nis: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(nis)
}

export function ConfirmationClient({ order, locale }: ConfirmationClientProps) {
  const t = useTranslations('confirmation')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  // ── Not found ────────────────────────────────────────────────────────────────
  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
        <div className="flex max-w-md flex-col items-center gap-6 py-24 text-center">
          <p className="text-lg text-[var(--color-text-muted)]">{t('notFound')}</p>
          <Link
            href="/shop"
            className="inline-flex min-h-[48px] items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] px-8 font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-600)]"
          >
            {t('shop')}
          </Link>
        </div>
      </div>
    )
  }

  const cardClass =
    'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5'

  return (
    <div className="min-h-screen bg-[var(--color-bg)] px-4 py-12">
      <motion.div
        className="mx-auto flex max-w-2xl flex-col gap-6"
        initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* ── 1. Success icon + heading ──────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-secondary)]">
            <CheckCircle2
              size={64}
              aria-hidden="true"
              className="text-[var(--color-primary)]"
              strokeWidth={1.5}
            />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">
              {t('title')}
            </h1>
            <p className="text-[var(--color-text-muted)]">{t('subtitle')}</p>
          </div>
        </div>

        {/* ── 2. Order number badge ──────────────────────────────────────────── */}
        <div className={cardClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">{t('orderNumber')}</span>
            <span className="font-mono text-base font-bold tabular-nums text-[var(--color-text)]">
              {order.orderNumber}
            </span>
          </div>
        </div>

        {/* ── 3. Items list ──────────────────────────────────────────────────── */}
        <div className={cardClass}>
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">
            {t('items')} ({order.items.length})
          </h2>
          <ul className="flex flex-col gap-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[var(--color-text-muted)]">
                    {item.quantity}× {formatPrice(item.unitPrice, locale)}
                    {item.isCustom && (
                      <span className="ms-1 text-xs italic">
                        {locale === 'he' ? 'מותאם' : 'custom'}
                      </span>
                    )}
                  </span>
                  {(item.customWidth || item.customHeight || item.customDepth) && (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {[item.customWidth, item.customHeight, item.customDepth]
                        .filter(Boolean)
                        .join('×')}{' '}
                      cm
                    </span>
                  )}
                </div>
                <span className="shrink-0 font-medium tabular-nums text-[var(--color-text)]">
                  {formatPrice(item.totalPrice, locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 4. Totals summary ──────────────────────────────────────────────── */}
        <div className={cardClass}>
          <div className="flex flex-col gap-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">{t('subtotal')}</span>
              <span className="text-sm tabular-nums text-[var(--color-text)]">
                {formatPrice(order.subtotal, locale)}
              </span>
            </div>

            {/* Shipping */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">{t('shipping')}</span>
              <span className="text-sm tabular-nums text-[var(--color-text)]">
                {order.shippingCost === 0 ? t('free') : formatPrice(order.shippingCost, locale)}
              </span>
            </div>

            {/* Discount — only when present */}
            {order.discount > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-[var(--color-text-muted)]">{t('discount')}</span>
                <span className="text-sm font-medium tabular-nums text-[var(--color-accent)]">
                  −{formatPrice(order.discount, locale)}
                </span>
              </div>
            )}

            <hr className="border-[var(--color-border)]" />

            {/* Total */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--color-text)]">{t('total')}</span>
              <span className="text-xl font-bold tabular-nums text-[var(--color-text)]">
                {formatPrice(order.total, locale)}
              </span>
            </div>
          </div>
        </div>

        {/* ── 5. Delivery estimate ───────────────────────────────────────────── */}
        <div className={`${cardClass} flex items-center gap-4`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)]">
            <Clock size={24} aria-hidden="true" className="text-[var(--color-primary)]" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-[var(--color-text-muted)]">{t('delivery')}</span>
            <span className="font-semibold text-[var(--color-text)]">{t('deliveryTime')}</span>
          </div>
        </div>

        {/* ── 6. CTAs ────────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] px-6 font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <Home size={16} aria-hidden="true" />
            {t('home')}
          </Link>
          <Link
            href="/shop"
            className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 font-semibold text-[var(--color-text)] transition-colors duration-150 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            <ShoppingBag size={16} aria-hidden="true" />
            {t('shop')}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
