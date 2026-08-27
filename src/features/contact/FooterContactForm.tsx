'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Loader2, Send } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { api } from '@/lib/api'

interface FooterContactFormProps {
  className?: string
  inputClassName?: string
  labelClassName?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function FooterContactForm({
  className,
  inputClassName,
  labelClassName,
}: FooterContactFormProps) {
  const t = useTranslations('footer')
  const locale = useLocale()
  const { addToast } = useUiStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length < 2) {
      addToast({ type: 'error', message: t('contactNameRequired') })
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      addToast({ type: 'error', message: t('contactInvalidEmail') })
      return
    }

    setSubmitting(true)
    try {
      await api.post('/api/contact', {
        name: name.trim(),
        email: email.trim(),
        subject: t('contactSubject'),
        message: message.trim() || undefined,
        language: locale,
      })
      addToast({ type: 'success', message: t('contactSuccess') })
      setName('')
      setEmail('')
      setMessage('')
    } catch {
      addToast({ type: 'error', message: t('contactError') })
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls =
    inputClassName ??
    'min-h-[44px] w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-main placeholder:text-text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <p className={labelClassName ?? 'mb-3 text-sm text-text-muted'}>{t('contactHeading')}</p>
      <div className="flex flex-col gap-2 md:flex-row md:items-start">
        <label htmlFor="footer-contact-name" className="sr-only">
          {t('contactNamePlaceholder')}
        </label>
        <input
          id="footer-contact-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('contactNamePlaceholder')}
          autoComplete="name"
          required
          className={`${inputCls} md:flex-1`}
        />
        <label htmlFor="footer-contact-email" className="sr-only">
          {t('contactEmailPlaceholder')}
        </label>
        <input
          id="footer-contact-email"
          type="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('contactEmailPlaceholder')}
          autoComplete="email"
          required
          className={`${inputCls} md:flex-1`}
        />
        <label htmlFor="footer-contact-message" className="sr-only">
          {t('contactMessagePlaceholder')}
        </label>
        <input
          id="footer-contact-message"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('contactMessagePlaceholder')}
          className={`${inputCls} md:flex-[2]`}
        />
        <button
          type="submit"
          disabled={submitting}
          className="flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-lg bg-primary px-5 text-sm font-semibold text-surface transition-colors duration-150 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
          ) : (
            <Send size={16} aria-hidden="true" />
          )}
          {t('contactSubmit')}
        </button>
      </div>
    </form>
  )
}
