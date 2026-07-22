'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'

const DEFAULT_WHATSAPP_NUMBER = '972500000000'
const DEFAULT_CONTACT_EMAIL = 'hello@luma.co.il'

export interface HomeContactContent {
  heading_he: string
  heading_en: string
  body_he: string
  body_en: string
  whatsapp_he: string
  whatsapp_en: string
  email_he: string
  email_en: string
}

interface ContactSectionProps {
  locale: string
  whatsappNumber: string
  email: string
  content?: HomeContactContent
}

export function ContactSection({ locale, whatsappNumber, email, content }: ContactSectionProps) {
  const WHATSAPP_NUMBER = whatsappNumber || DEFAULT_WHATSAPP_NUMBER
  const CONTACT_EMAIL = email || DEFAULT_CONTACT_EMAIL
  const t = useTranslations('home.contact')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion

  const isHe = locale === 'he'
  const heading = (isHe ? content?.heading_he : content?.heading_en) || t('heading')
  const body = (isHe ? content?.body_he : content?.body_en) || t('body')
  const whatsappLabel = (isHe ? content?.whatsapp_he : content?.whatsapp_en) || t('whatsapp')
  const emailLabel = (isHe ? content?.email_he : content?.email_en) || t('email')

  return (
    <section id="contact" className="py-16 md:py-24">
      <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
        {/* Decorative divider */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-8"
          initial={shouldAnimate ? { opacity: 0, scaleX: 0.6 } : false}
          whileInView={shouldAnimate ? { opacity: 1, scaleX: 1 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <span className="h-px w-16 bg-border block" />
          <svg
            aria-hidden="true"
            className="w-5 h-5 text-primary shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="h-px w-16 bg-border block" />
        </motion.div>

        {/* Heading */}
        <motion.h2
          className="font-heading text-3xl md:text-4xl font-semibold text-text-main mb-4"
          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
          whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          {heading}
        </motion.h2>

        {/* Body */}
        <motion.p
          className="text-text-muted leading-relaxed text-lg mb-10 max-w-xl mx-auto"
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
        >
          {body}
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={shouldAnimate ? { opacity: 0, y: 16 } : false}
          whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
        >
          {/* WhatsApp CTA */}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 rounded-lg bg-primary px-7 py-3 text-base font-semibold text-surface shadow-sm hover:bg-primary-600 active:opacity-80 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <svg
              aria-hidden="true"
              className="w-5 h-5 shrink-0"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            {whatsappLabel}
          </a>

          {/* Email secondary link */}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-primary font-semibold underline hover:text-primary-600 transition-colors duration-150 text-base"
          >
            {emailLabel}
          </a>
        </motion.div>
      </div>
    </section>
  )
}
