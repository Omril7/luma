'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations, useLocale } from 'next-intl'
import Link from 'next/link'
import { useUiStore } from '@/stores/uiStore'
import { useConsentStore } from '@/stores/consentStore'
import { updateConsent } from '@/lib/analytics'

export function ConsentBanner() {
  const t = useTranslations('cookieConsent')
  const locale = useLocale()
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const { status, setStatus } = useConsentStore()

  // Avoid a hydration mismatch: the persisted consent status only exists in localStorage, so
  // the client's first render must match the server's ('unset') before rehydration settles.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  function choose(next: 'granted' | 'denied') {
    setStatus(next)
    updateConsent(next)
  }

  const visible = mounted && status === 'unset'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label={t('title')}
          initial={shouldAnimate ? { opacity: 0, y: 40 } : { opacity: 1 }}
          animate={{ opacity: 1, y: 0 }}
          exit={shouldAnimate ? { opacity: 0, y: 40 } : { opacity: 0 }}
          transition={shouldAnimate ? { duration: 0.3, ease: 'easeOut' } : { duration: 0 }}
          className="fixed inset-x-4 bottom-4 z-[9998] mx-auto max-w-xl rounded-lg border border-border bg-surface p-4 shadow-soft sm:p-5"
        >
          <p className="text-sm leading-relaxed text-text-main">
            {t('message')}{' '}
            <Link
              href={`/${locale}/privacy`}
              className="underline text-text-muted transition-colors hover:text-text-main"
            >
              {t('privacyLink')}
            </Link>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => choose('granted')}
              className="cursor-pointer rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-surface transition-all duration-150 hover:-translate-y-0.5 hover:bg-primary-600 focus-visible:outline-2"
            >
              {t('accept')}
            </button>
            <button
              type="button"
              onClick={() => choose('denied')}
              className="cursor-pointer rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-text-main transition-all duration-150 hover:bg-secondary focus-visible:outline-2"
            >
              {t('essentialOnly')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
