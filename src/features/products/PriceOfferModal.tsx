'use client'

import { useState, useEffect, useRef, useId } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { X, Check, Send } from 'lucide-react'
import { api } from '@/lib/api'
import { useUiStore } from '@/stores/uiStore'
import type { ProductDTO } from '@/shared/types'

export interface PriceOfferSelection {
  variantId: string | null
  isCustom: boolean
  customWidth?: number
  customHeight?: number
  customDepth?: number
  colorId: string | null
  quantity: number
}

interface PriceOfferModalProps {
  open: boolean
  onClose: () => void
  product: ProductDTO
  locale: string
  selection: PriceOfferSelection
  /** Pre-formatted current price, when the selection is priceable. */
  estimatedPrice?: string
}

interface FieldErrors {
  name?: string
  phone?: string
  email?: string
}

const PHONE_RE = /^[0-9+\-() ]{7,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function PriceOfferModal({
  open,
  onClose,
  product,
  locale,
  selection,
  estimatedPrice,
}: PriceOfferModalProps) {
  const t = useTranslations('product.priceOffer')
  const tProduct = useTranslations('product')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const titleId = useId()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const firstFieldRef = useRef<HTMLInputElement>(null)

  // Fresh form each time the dialog opens
  useEffect(() => {
    if (!open) return
    setName('')
    setPhone('')
    setEmail('')
    setMessage('')
    setErrors({})
    setSubmitting(false)
    setSubmitted(false)
    setSubmitError(null)
    const id = setTimeout(() => firstFieldRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [open])

  // Escape closes
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function validateField(field: keyof FieldErrors): string | undefined {
    if (field === 'name' && name.trim().length < 2) return t('errorName')
    if (field === 'phone' && !PHONE_RE.test(phone.trim())) return t('errorPhone')
    if (field === 'email' && email.trim() !== '' && !EMAIL_RE.test(email.trim()))
      return t('errorEmail')
    return undefined
  }

  function handleBlur(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: validateField(field) }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const nextErrors: FieldErrors = {
      name: validateField('name'),
      phone: validateField('phone'),
      email: validateField('email'),
    }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.phone || nextErrors.email) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      await api.post('/api/price-offers', {
        productId: product.id,
        customerName: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        variantId: selection.isCustom ? undefined : (selection.variantId ?? undefined),
        isCustom: selection.isCustom,
        customWidth: selection.isCustom ? selection.customWidth : undefined,
        customHeight: selection.isCustom ? selection.customHeight : undefined,
        customDepth: selection.isCustom ? selection.customDepth : undefined,
        colorId: selection.colorId ?? undefined,
        quantity: selection.quantity,
        language: locale === 'he' ? 'he' : 'en',
      })
      setSubmitted(true)
    } catch {
      setSubmitError(t('errorGeneral'))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Selection summary ─────────────────────────────────────────────────────────
  const productName = locale === 'he' ? product.name_he : product.name_en
  const variant = product.variants.find((v) => v.id === selection.variantId)
  const color = product.colorOptions.find((c) => c.id === selection.colorId)

  const summaryParts: string[] = [productName]
  if (selection.isCustom) {
    const dims = [selection.customWidth, selection.customHeight, selection.customDepth]
      .filter((d) => d != null)
      .join('×')
    summaryParts.push(dims ? `${t('customDims')}: ${dims} ${tProduct('cm')}` : t('customDims'))
  } else if (variant) {
    summaryParts.push(locale === 'he' ? variant.name_he : variant.name_en)
  }
  if (color) summaryParts.push(locale === 'he' ? color.name_he : color.name_en)
  if (selection.quantity > 1) summaryParts.push(`${t('quantityLabel')}: ${selection.quantity}`)

  const inputClass = (hasError: boolean) =>
    `min-h-[44px] w-full rounded-lg border bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline focus:outline-2 focus:outline-primary ${
      hasError ? 'border-red-500' : 'border-border'
    }`

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm"
          initial={shouldAnimate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={shouldAnimate ? { opacity: 0 } : undefined}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            className="bg-surface border border-border sm:rounded-2xl rounded-t-2xl shadow-xl w-full sm:max-w-md max-h-[90dvh] overflow-y-auto"
            initial={shouldAnimate ? { opacity: 0, y: 24, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldAnimate ? { opacity: 0, y: 24, scale: 0.98 } : undefined}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-5 pb-0">
              <div>
                <h2 id={titleId} className="text-lg font-bold text-text-main">
                  {t('title')}
                </h2>
                {!submitted && <p className="mt-1 text-sm text-text-muted">{t('subtitle')}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('close')}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-text-muted hover:bg-secondary hover:text-text-main transition-colors cursor-pointer -me-2 -mt-2"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            {submitted ? (
              /* Success state */
              <div className="p-5 pt-4 flex flex-col items-center text-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Check size={28} aria-hidden="true" />
                </span>
                <p className="text-base font-semibold text-text-main">{t('successTitle')}</p>
                <p className="text-sm text-text-muted">{t('successBody')}</p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 min-h-[44px] rounded-full bg-primary px-6 font-semibold text-sm text-surface hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {t('close')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="p-5 pt-4 flex flex-col gap-4">
                {/* Selection summary */}
                <div className="rounded-xl bg-secondary border border-border p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
                    {t('yourSelection')}
                  </p>
                  <p className="text-text-main">{summaryParts.join(' · ')}</p>
                  {estimatedPrice && (
                    <p className="mt-1 text-text-muted">
                      {t('estimatedLabel')}:{' '}
                      <span className="font-semibold text-primary tabular-nums">
                        {estimatedPrice}
                      </span>
                    </p>
                  )}
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="offer-name" className="text-sm font-medium text-text-main">
                    {t('name')}{' '}
                    <span className="text-accent" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    ref={firstFieldRef}
                    id="offer-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur('name')}
                    aria-invalid={!!errors.name}
                    className={inputClass(!!errors.name)}
                  />
                  {errors.name && (
                    <p role="alert" className="text-xs text-red-600">
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="offer-phone" className="text-sm font-medium text-text-main">
                    {t('phone')}{' '}
                    <span className="text-accent" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="offer-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onBlur={() => handleBlur('phone')}
                    aria-invalid={!!errors.phone}
                    className={`${inputClass(!!errors.phone)} text-start`}
                  />
                  {errors.phone && (
                    <p role="alert" className="text-xs text-red-600">
                      {errors.phone}
                    </p>
                  )}
                </div>

                {/* Email (optional) */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="offer-email" className="text-sm font-medium text-text-main">
                    {t('email')}{' '}
                    <span className="text-xs font-normal text-text-muted">({t('optional')})</span>
                  </label>
                  <input
                    id="offer-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur('email')}
                    aria-invalid={!!errors.email}
                    className={`${inputClass(!!errors.email)} text-start`}
                  />
                  {errors.email && (
                    <p role="alert" className="text-xs text-red-600">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Message (optional) */}
                <div className="flex flex-col gap-1">
                  <label htmlFor="offer-message" className="text-sm font-medium text-text-main">
                    {t('message')}{' '}
                    <span className="text-xs font-normal text-text-muted">({t('optional')})</span>
                  </label>
                  <textarea
                    id="offer-message"
                    rows={3}
                    maxLength={2000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('messagePlaceholder')}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-main placeholder:text-text-muted focus:outline focus:outline-2 focus:outline-primary resize-none"
                  />
                </div>

                {submitError && (
                  <p role="alert" className="text-sm text-red-600">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-primary font-semibold text-base text-surface hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={18} aria-hidden="true" />
                  {submitting ? t('sending') : t('send')}
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
