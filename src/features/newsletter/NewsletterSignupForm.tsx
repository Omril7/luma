'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, Send } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { api } from '@/lib/api'
import { Input } from '@/components/ui/Input'

interface NewsletterSignupFormProps {
  className?: string
  inputClassName?: string
  labelClassName?: string
}

export function NewsletterSignupForm({
  className,
  inputClassName,
  labelClassName,
}: NewsletterSignupFormProps) {
  const t = useTranslations('newsletter.signup')
  const locale = useLocale()
  const { addToast } = useUiStore()

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      addToast({ type: 'error', message: t('invalidEmail') })
      return
    }

    setSubmitting(true)
    try {
      await api.post('/api/newsletter/subscribe', {
        email: email.trim(),
        name: name.trim() || undefined,
        language: locale,
      })
      addToast({ type: 'success', message: t('success') })
      setEmail('')
      setName('')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      addToast({
        type: 'error',
        message: /already|קיים/i.test(message) ? t('alreadySubscribed') : t('error'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <p className={labelClassName ?? 'mb-3 text-sm text-text-muted'}>{t('heading')}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="newsletter-name" className="sr-only">
          {t('namePlaceholder')}
        </label>
        <Input
          variant="storefront"
          id="newsletter-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('namePlaceholder')}
          autoComplete="name"
          className={inputClassName}
        />
        <label htmlFor="newsletter-email" className="sr-only">
          {t('emailPlaceholder')}
        </label>
        <Input
          variant="storefront"
          id="newsletter-email"
          type="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          autoComplete="email"
          required
          className={inputClassName}
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-surface transition-colors duration-150 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {t('submit')}
        </button>
      </div>
    </form>
  )
}
