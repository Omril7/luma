'use client'

import { useState } from 'react'
import {
  User,
  Truck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingCart,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { useCartStore } from '@/stores/cartStore'
import { useUiStore } from '@/stores/uiStore'
import { api } from '@/lib/api'

interface CheckoutClientProps {
  locale: string
}

function formatPrice(agorot: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(agorot / 100)
}

const INSTALLMENT_OPTIONS = [1, 3, 6, 12]
const SHIPPING_COST_AGOROT = 15000 // ₪150 in agorot

export function CheckoutClient({ locale }: CheckoutClientProps) {
  const t = useTranslations('checkout')
  const { items, couponCode, discount, subtotal, total, clear } = useCartStore()
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const router = useRouter()
  const isRtl = locale === 'he'

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    shippingMethod: 'NATIONAL_SHIPPING' as 'NATIONAL_SHIPPING' | 'PICKUP',
    installments: 1,
    notes: '',
    terms: false,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // ── Empty cart guard ─────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
        <motion.div
          className="mx-auto flex w-full max-w-md flex-col items-center gap-6 py-24 text-center"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-secondary)]">
            <ShoppingCart
              size={48}
              strokeWidth={1.25}
              aria-hidden="true"
              className="text-[var(--color-text-muted)]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-[var(--color-text)]">{t('emptyCart')}</h1>
          </div>
          <Link
            href="/shop"
            className="inline-flex min-h-[48px] items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] px-8 font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-600)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
          >
            {t('emptyCartCta')}
          </Link>
        </motion.div>
      </div>
    )
  }

  // ── Computed totals ──────────────────────────────────────────────────────────
  const subtotalValue = subtotal()
  const shippingAgorot = form.shippingMethod === 'NATIONAL_SHIPPING' ? SHIPPING_COST_AGOROT : 0
  const totalValue = Math.max(0, subtotalValue + shippingAgorot - discount)

  // ── Validation ───────────────────────────────────────────────────────────────
  function validate(): Partial<Record<keyof typeof form, string>> {
    const errs: Partial<Record<keyof typeof form, string>> = {}
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = t('required')
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = t('invalidEmail')
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 9)
      errs.phone = t('invalidPhone')
    if (form.shippingMethod === 'NATIONAL_SHIPPING') {
      if (!form.street.trim()) errs.street = t('required')
      if (!form.city.trim()) errs.city = t('required')
    }
    if (!form.terms) errs.terms = t('termsRequired')
    return errs
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      // Focus first error field
      const firstKey = Object.keys(errs)[0] as keyof typeof form
      const el = document.getElementById(firstKey)
      el?.focus()
      return
    }
    setSubmitting(true)
    setServerError(null)
    try {
      const order = await api.post<{ id: string }>('/api/orders', {
        customerName: form.name.trim(),
        customerEmail: form.email.trim(),
        customerPhone: form.phone.trim(),
        shippingAddress: {
          street: form.shippingMethod === 'NATIONAL_SHIPPING' ? form.street.trim() : '-',
          city: form.shippingMethod === 'NATIONAL_SHIPPING' ? form.city.trim() : '-',
          country: 'Israel',
        },
        shippingMethod: form.shippingMethod,
        couponCode: couponCode ?? undefined,
        installments: form.installments,
        notes: form.notes.trim() || undefined,
        language: locale as 'he' | 'en',
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          isCustom: item.isCustom,
          customWidth: item.customWidth,
          customHeight: item.customHeight,
          customDepth: item.customDepth,
          customDiameter: item.customDiameter,
          selectedColorId: item.selectedColorId,
          quantity: item.quantity,
        })),
      })
      clear()
      router.push(`/order-confirmation/${order.id}`)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('errorGeneral'))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Field change helper ───────────────────────────────────────────────────────
  function handleChange(field: keyof typeof form, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // ── Input class ──────────────────────────────────────────────────────────────
  const inputClass =
    'min-h-[44px] w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline focus:outline-2 focus:outline-[var(--color-primary)]'

  const errorClass = 'mt-1 text-xs text-[var(--color-accent)]'

  const cardClass =
    'rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6'

  const sectionHeadingClass =
    'mb-4 flex items-center gap-2 text-base font-semibold text-[var(--color-text)]'

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-8 md:py-12">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        {/* Page heading + back link */}
        <motion.div
          className="mb-8 flex items-center gap-3"
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <Link
            href="/cart"
            className="flex min-h-[44px] items-center gap-1 rounded-[var(--radius)] px-2 text-sm text-[var(--color-text-muted)] transition-colors duration-150 hover:text-[var(--color-text)]"
            aria-label={t('backToCart')}
          >
            {isRtl ? (
              <ChevronRight size={18} aria-hidden="true" />
            ) : (
              <ChevronLeft size={18} aria-hidden="true" />
            )}
            <span>{t('backToCart')}</span>
          </Link>
          <h1 className="text-2xl font-bold text-[var(--color-text)] md:text-3xl">{t('title')}</h1>
        </motion.div>

        {/* Two-column layout */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* ── Form (2/3) ─────────────────────────────────────────────────── */}
          <motion.div
            className="flex flex-col gap-6 lg:col-span-2"
            initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: shouldAnimate ? 0.05 : 0 }}
          >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
              {/* ── Section 1: Customer info ──────────────────────────────── */}
              <section className={cardClass} aria-labelledby="section-customer">
                <h2 id="section-customer" className={sectionHeadingClass}>
                  <User size={18} aria-hidden="true" className="text-[var(--color-primary)]" />
                  {t('name')}
                </h2>

                {/* Name */}
                <div className="mb-4">
                  <label
                    htmlFor="name"
                    className="mb-1 block text-sm font-medium text-[var(--color-text)]"
                  >
                    {t('name')}
                  </label>
                  <input
                    id="name"
                    type="text"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={inputClass}
                    aria-describedby={errors.name ? 'error-name' : undefined}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && (
                    <p id="error-name" role="alert" className={errorClass}>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-[var(--color-text)]"
                  >
                    {t('email')}
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={inputClass}
                    aria-describedby={errors.email ? 'error-email' : undefined}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && (
                    <p id="error-email" role="alert" className={errorClass}>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1 block text-sm font-medium text-[var(--color-text)]"
                  >
                    {t('phone')}
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className={inputClass}
                    aria-describedby={errors.phone ? 'error-phone' : undefined}
                    aria-invalid={!!errors.phone}
                  />
                  {errors.phone && (
                    <p id="error-phone" role="alert" className={errorClass}>
                      {errors.phone}
                    </p>
                  )}
                </div>
              </section>

              {/* ── Section 2: Shipping method ────────────────────────────── */}
              <section className={cardClass} aria-labelledby="section-shipping">
                <h2 id="section-shipping" className={sectionHeadingClass}>
                  <Truck size={18} aria-hidden="true" className="text-[var(--color-primary)]" />
                  {t('shipping')}
                </h2>

                {/* Radio cards */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(['NATIONAL_SHIPPING', 'PICKUP'] as const).map((method) => (
                    <label
                      key={method}
                      className={`flex cursor-pointer items-center gap-3 rounded-[var(--radius)] border-2 p-4 transition-colors duration-150 ${
                        form.shippingMethod === method
                          ? 'border-[var(--color-primary)] bg-[var(--color-secondary)]'
                          : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={method}
                        checked={form.shippingMethod === method}
                        onChange={() => handleChange('shippingMethod', method)}
                        className="sr-only"
                      />
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="font-medium text-[var(--color-text)]">
                          {method === 'NATIONAL_SHIPPING' ? t('nationalShipping') : t('pickup')}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {method === 'NATIONAL_SHIPPING' ? t('shippingCost') : t('freePickup')}
                        </span>
                      </div>
                      {/* Visual radio indicator */}
                      <div
                        className={`h-5 w-5 shrink-0 rounded-full border-2 transition-colors duration-150 ${
                          form.shippingMethod === method
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                            : 'border-[var(--color-border)]'
                        }`}
                        aria-hidden="true"
                      />
                    </label>
                  ))}
                </div>

                {/* Address fields — animate in when NATIONAL_SHIPPING selected */}
                <AnimatePresence initial={false}>
                  {form.shippingMethod === 'NATIONAL_SHIPPING' && (
                    <motion.div
                      key="address"
                      initial={shouldAnimate ? { opacity: 0, height: 0 } : false}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={shouldAnimate ? { opacity: 0, height: 0 } : undefined}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-4 pt-2">
                        {/* Street */}
                        <div>
                          <label
                            htmlFor="street"
                            className="mb-1 block text-sm font-medium text-[var(--color-text)]"
                          >
                            {t('street')}
                          </label>
                          <input
                            id="street"
                            type="text"
                            autoComplete="street-address"
                            value={form.street}
                            onChange={(e) => handleChange('street', e.target.value)}
                            className={inputClass}
                            aria-describedby={errors.street ? 'error-street' : undefined}
                            aria-invalid={!!errors.street}
                          />
                          {errors.street && (
                            <p id="error-street" role="alert" className={errorClass}>
                              {errors.street}
                            </p>
                          )}
                        </div>

                        {/* City */}
                        <div>
                          <label
                            htmlFor="city"
                            className="mb-1 block text-sm font-medium text-[var(--color-text)]"
                          >
                            {t('city')}
                          </label>
                          <input
                            id="city"
                            type="text"
                            autoComplete="address-level2"
                            value={form.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            className={inputClass}
                            aria-describedby={errors.city ? 'error-city' : undefined}
                            aria-invalid={!!errors.city}
                          />
                          {errors.city && (
                            <p id="error-city" role="alert" className={errorClass}>
                              {errors.city}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* ── Section 3: Installments ───────────────────────────────── */}
              <section className={cardClass} aria-labelledby="section-installments">
                <h2 id="section-installments" className={sectionHeadingClass}>
                  <CreditCard
                    size={18}
                    aria-hidden="true"
                    className="text-[var(--color-primary)]"
                  />
                  {t('installments')}
                </h2>
                <div className="flex flex-wrap gap-3">
                  {INSTALLMENT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleChange('installments', n)}
                      className={`min-h-[44px] rounded-full px-5 text-sm font-medium transition-colors duration-150 ${
                        form.installments === n
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]'
                      }`}
                    >
                      {n === 1 ? t('installmentsOne') : t('installmentsN', { count: n })}
                    </button>
                  ))}
                </div>
              </section>

              {/* ── Section 4: Notes + Terms ──────────────────────────────── */}
              <section className={cardClass} aria-labelledby="section-notes">
                <h2 id="section-notes" className={`${sectionHeadingClass} sr-only`}>
                  {t('notes')}
                </h2>

                {/* Notes textarea */}
                <div className="mb-5">
                  <label
                    htmlFor="notes"
                    className="mb-1 block text-sm font-medium text-[var(--color-text)]"
                  >
                    {t('notes')}
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder={t('notesPlaceholder')}
                    className="min-h-[44px] w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline focus:outline-2 focus:outline-[var(--color-primary)] resize-y"
                  />
                </div>

                {/* Terms checkbox */}
                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      id="terms"
                      type="checkbox"
                      checked={form.terms}
                      onChange={(e) => handleChange('terms', e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[var(--color-primary)]"
                      aria-describedby={errors.terms ? 'error-terms' : undefined}
                      aria-invalid={!!errors.terms}
                    />
                    <span className="text-sm text-[var(--color-text)]">{t('terms')}</span>
                  </label>
                  {errors.terms && (
                    <p id="error-terms" role="alert" className={`${errorClass} mt-2`}>
                      {errors.terms}
                    </p>
                  )}
                </div>
              </section>

              {/* ── Server error ──────────────────────────────────────────── */}
              {serverError && (
                <div
                  role="alert"
                  className="rounded-[var(--radius)] border border-[var(--color-accent)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-accent)]"
                >
                  {serverError}
                </div>
              )}

              {/* ── Submit button ─────────────────────────────────────────── */}
              <button
                type="submit"
                disabled={submitting}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--color-primary)] font-semibold text-white transition-colors duration-150 hover:bg-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} aria-hidden="true" className="animate-spin" />
                    {t('processing')}
                  </>
                ) : (
                  t('pay')
                )}
              </button>
            </form>
          </motion.div>

          {/* ── Summary sidebar (1/3) ─────────────────────────────────────────── */}
          <motion.aside
            className="mt-8 lg:col-span-1 lg:mt-0"
            initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut', delay: shouldAnimate ? 0.1 : 0 }}
          >
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] lg:sticky lg:top-24">
              <h2 className="mb-4 text-base font-semibold text-[var(--color-text)]">
                {t('summary')}
              </h2>

              {/* Item list */}
              <ul className="mb-4 flex flex-col gap-2">
                {items.map((item) => {
                  const name = locale === 'he' ? item.name_he : item.name_en
                  return (
                    <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                      <span className="line-clamp-2 text-[var(--color-text-muted)]">
                        {name}
                        {item.quantity > 1 && (
                          <span className="ms-1 text-xs">×{item.quantity}</span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums text-[var(--color-text)]">
                        {formatPrice(item.totalPrice, locale)}
                      </span>
                    </li>
                  )
                })}
              </ul>

              <hr className="mb-4 border-[var(--color-border)]" />

              {/* Summary rows */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--color-text-muted)]">{t('subtotal')}</span>
                  <span className="text-sm font-medium tabular-nums text-[var(--color-text)]">
                    {formatPrice(subtotalValue, locale)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {t('shippingLabel')}
                  </span>
                  <span className="text-sm tabular-nums text-[var(--color-text)]">
                    {shippingAgorot === 0 ? t('freePickup') : formatPrice(shippingAgorot, locale)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {t('discountLabel')}
                    </span>
                    <span className="text-sm font-medium tabular-nums text-[var(--color-accent)]">
                      −{formatPrice(discount, locale)}
                    </span>
                  </div>
                )}

                <hr className="border-[var(--color-border)]" />

                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[var(--color-text)]">{t('totalLabel')}</span>
                  <span className="text-xl font-bold tabular-nums text-[var(--color-text)]">
                    {formatPrice(totalValue, locale)}
                  </span>
                </div>
              </div>
            </div>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}
