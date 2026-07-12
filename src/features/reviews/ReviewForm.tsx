'use client'

import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { api } from '@/lib/api'
import { StarRating } from '@/components/ui/StarRating'

interface ReviewFormProps {
  productId: string
  locale: string
}

interface FormState {
  customerName: string
  rating: number
  comment: string
}

const EMPTY_FORM: FormState = { customerName: '', rating: 0, comment: '' }

export function ReviewForm({ productId, locale }: ReviewFormProps) {
  const t = useTranslations('reviews')
  const { a11y, addToast } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<'customerName' | 'rating', string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  function validate(): boolean {
    const next: Partial<Record<'customerName' | 'rating', string>> = {}
    if (form.customerName.trim().length < 2) next.customerName = t('required')
    if (form.rating < 1) next.rating = t('ratingRequired')
    setErrors(next)

    if (next.customerName) {
      nameRef.current?.focus()
      return false
    }
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await api.post('/api/reviews', {
        productId,
        customerName: form.customerName.trim(),
        rating: form.rating,
        comment_he: locale === 'he' ? form.comment.trim() || undefined : undefined,
        comment_en: locale === 'en' ? form.comment.trim() || undefined : undefined,
      })
      setSubmitted(true)
      setForm(EMPTY_FORM)
    } catch {
      addToast({ type: 'error', message: t('formError') })
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    'w-full min-h-[44px] rounded-lg border bg-surface px-3.5 py-2.5 text-text-main placeholder:text-text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary'

  if (submitted) {
    return (
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 10 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 rounded-lg border border-border bg-bg p-5 text-text-main"
      >
        <CheckCircle2 size={22} className="shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm leading-relaxed">{t('formPendingNotice')}</p>
      </motion.div>
    )
  }

  return (
    <motion.form
      noValidate
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-border bg-bg p-5"
      initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
      whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <h3 className="font-heading text-lg font-semibold text-text-main">{t('formHeading')}</h3>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-text-main">{t('formRating')}</span>
        <StarRating
          value={form.rating}
          onChange={(rating) => {
            setForm((f) => ({ ...f, rating }))
            if (errors.rating) setErrors((e) => ({ ...e, rating: undefined }))
          }}
          aria-label={t('formRating')}
        />
        {errors.rating && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {errors.rating}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="review-name" className="mb-1.5 block text-sm font-medium text-text-main">
          {t('formName')}
        </label>
        <input
          ref={nameRef}
          id="review-name"
          type="text"
          autoComplete="name"
          value={form.customerName}
          onChange={(e) => {
            setForm((f) => ({ ...f, customerName: e.target.value }))
            if (errors.customerName) setErrors((e) => ({ ...e, customerName: undefined }))
          }}
          aria-invalid={!!errors.customerName}
          aria-describedby={errors.customerName ? 'review-name-error' : undefined}
          className={`${inputCls} ${errors.customerName ? 'border-red-400' : 'border-border'}`}
        />
        {errors.customerName && (
          <p id="review-name-error" role="alert" className="mt-1 text-sm text-red-600">
            {errors.customerName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="review-comment" className="mb-1.5 block text-sm font-medium text-text-main">
          {t('formComment')}
        </label>
        <textarea
          id="review-comment"
          rows={4}
          value={form.comment}
          onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
          className={`${inputCls} resize-none border-border`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-surface transition-colors duration-150 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer sm:w-auto"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" aria-hidden="true" />
            {t('formSubmitting')}
          </>
        ) : (
          t('formSubmit')
        )}
      </button>
    </motion.form>
  )
}
