'use client'

import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Phone, Mail, MapPin, Clock, Loader2, CheckCircle2 } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { api } from '@/lib/api'

interface ContactInfo {
  phone: string
  whatsapp: string
  email: string
  address_he: string
  address_en: string
  hours_he: string
  hours_en: string
}

interface ContactClientProps {
  locale: string
  info: ContactInfo
}

interface FormState {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}

const EMPTY_FORM: FormState = { name: '', email: '', phone: '', subject: '', message: '' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ContactClient({ locale, info }: ContactClientProps) {
  const t = useTranslations('contact')
  const { a11y, addToast } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const subjectRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const fieldRefs = { name: nameRef, email: emailRef, subject: subjectRef, message: messageRef }

  const address = locale === 'he' ? info.address_he : info.address_en
  const hours = locale === 'he' ? info.hours_he : info.hours_en
  const whatsappUrl = info.whatsapp ? `https://wa.me/${info.whatsapp.replace(/[^0-9]/g, '')}` : null
  const telHref = info.phone ? `tel:${info.phone.replace(/[^0-9+]/g, '')}` : null

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {}
    if (form.name.trim().length < 2) next.name = t('required')
    if (!EMAIL_RE.test(form.email.trim())) next.email = t('invalidEmail')
    if (form.subject.trim().length < 2) next.subject = t('required')
    if (form.message.trim().length < 10) next.message = t('tooShortMessage')
    setErrors(next)

    if (Object.keys(next).length > 0) {
      const firstKey = (['name', 'email', 'subject', 'message'] as const).find((k) => next[k])
      if (firstKey) fieldRefs[firstKey].current?.focus()
      return false
    }
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await api.post('/api/contact', {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        subject: form.subject.trim(),
        message: form.message.trim(),
        language: locale,
      })
      setSubmitted(true)
      setForm(EMPTY_FORM)
      addToast({ type: 'success', message: t('formSuccess') })
    } catch {
      addToast({ type: 'error', message: t('formError') })
    } finally {
      setSubmitting(false)
    }
  }

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const inputCls =
    'w-full min-h-[44px] rounded-lg border bg-surface px-3.5 py-2.5 text-text-main placeholder:text-text-muted/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <motion.div
          className="mx-auto mb-10 max-w-2xl text-center md:mb-14"
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <h1 className="font-heading text-3xl font-semibold text-text-main md:text-4xl lg:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-text-muted">{t('subtitle')}</p>
        </motion.div>

        <div className="grid gap-10 md:grid-cols-5 md:gap-12">
          {/* Form */}
          <motion.form
            noValidate
            onSubmit={handleSubmit}
            className="order-2 space-y-4 md:order-1 md:col-span-3"
            initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <div>
              <label
                htmlFor="contact-name"
                className="mb-1.5 block text-sm font-medium text-text-main"
              >
                {t('formName')}
              </label>
              <input
                ref={nameRef}
                id="contact-name"
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'contact-name-error' : undefined}
                className={`${inputCls} ${errors.name ? 'border-red-400' : 'border-border'}`}
              />
              {errors.name && (
                <p id="contact-name-error" role="alert" className="mt-1 text-sm text-red-600">
                  {errors.name}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="contact-email"
                  className="mb-1.5 block text-sm font-medium text-text-main"
                >
                  {t('formEmail')}
                </label>
                <input
                  ref={emailRef}
                  id="contact-email"
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'contact-email-error' : undefined}
                  className={`${inputCls} ${errors.email ? 'border-red-400' : 'border-border'}`}
                />
                {errors.email && (
                  <p id="contact-email-error" role="alert" className="mt-1 text-sm text-red-600">
                    {errors.email}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="contact-phone"
                  className="mb-1.5 block text-sm font-medium text-text-main"
                >
                  {t('formPhone')}
                </label>
                <input
                  id="contact-phone"
                  type="tel"
                  dir="ltr"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  className={`${inputCls} border-border`}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="contact-subject"
                className="mb-1.5 block text-sm font-medium text-text-main"
              >
                {t('formSubject')}
              </label>
              <input
                ref={subjectRef}
                id="contact-subject"
                type="text"
                value={form.subject}
                onChange={(e) => set('subject', e.target.value)}
                aria-invalid={!!errors.subject}
                aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                className={`${inputCls} ${errors.subject ? 'border-red-400' : 'border-border'}`}
              />
              {errors.subject && (
                <p id="contact-subject-error" role="alert" className="mt-1 text-sm text-red-600">
                  {errors.subject}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="mb-1.5 block text-sm font-medium text-text-main"
              >
                {t('formMessage')}
              </label>
              <textarea
                ref={messageRef}
                id="contact-message"
                rows={5}
                value={form.message}
                onChange={(e) => set('message', e.target.value)}
                aria-invalid={!!errors.message}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
                className={`${inputCls} resize-none ${errors.message ? 'border-red-400' : 'border-border'}`}
              />
              {errors.message && (
                <p id="contact-message-error" role="alert" className="mt-1 text-sm text-red-600">
                  {errors.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-surface transition-colors duration-150 hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  {t('formSubmitting')}
                </>
              ) : submitted ? (
                <>
                  <CheckCircle2 size={18} aria-hidden="true" />
                  {t('formSubmit')}
                </>
              ) : (
                t('formSubmit')
              )}
            </button>
          </motion.form>

          {/* Info sidebar */}
          <motion.aside
            className="order-1 md:order-2 md:col-span-2"
            initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          >
            <div className="space-y-5 rounded-2xl border border-border bg-bg p-6">
              <h2 className="font-heading text-lg font-semibold text-text-main">
                {t('infoHeading')}
              </h2>

              {telHref && (
                <a
                  href={telHref}
                  className="flex items-start gap-3 text-text-main transition-colors hover:text-primary"
                >
                  <Phone size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                  <span dir="ltr">{info.phone}</span>
                </a>
              )}

              {info.email && (
                <a
                  href={`mailto:${info.email}`}
                  className="flex items-start gap-3 text-text-main transition-colors hover:text-primary"
                >
                  <Mail size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                  <span dir="ltr" className="break-all">
                    {info.email}
                  </span>
                </a>
              )}

              {address && (
                <div className="flex items-start gap-3 text-text-main">
                  <MapPin size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                  <span>{address}</span>
                </div>
              )}

              {hours && (
                <div className="flex items-start gap-3 text-text-main">
                  <Clock size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-text-muted">{t('hoursHeading')}</p>
                    <p>{hours}</p>
                  </div>
                </div>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-lg bg-primary px-5 text-sm font-semibold text-surface shadow-sm transition-colors duration-150 hover:bg-primary-600"
                >
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  {t('whatsapp')}
                </a>
              )}
            </div>
          </motion.aside>
        </div>
      </div>
    </section>
  )
}
