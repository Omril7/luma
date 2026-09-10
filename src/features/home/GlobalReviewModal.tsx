'use client'

import { useEffect, useId } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import { ReviewForm } from '@/features/reviews/ReviewForm'

interface GlobalReviewModalProps {
  open: boolean
  onClose: () => void
  locale: string
}

/** "Write us a review" entry point on the home page — a global (product-less) review. */
export function GlobalReviewModal({ open, onClose, locale }: GlobalReviewModalProps) {
  const t = useTranslations('reviews')
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
          initial={shouldAnimate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={shouldAnimate ? { opacity: 0 } : undefined}
          transition={{ duration: 0.15 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <motion.div
            className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-xl sm:max-w-lg sm:rounded-2xl"
            initial={shouldAnimate ? { opacity: 0, y: 24, scale: 0.98 } : false}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldAnimate ? { opacity: 0, y: 24, scale: 0.98 } : undefined}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-3 p-5 pb-0">
              <h2 id={titleId} className="text-lg font-bold text-text-main">
                {t('globalFormHeading')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('imageClose')}
                className="-me-2 -mt-2 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-text-muted transition-colors hover:bg-secondary hover:text-text-main cursor-pointer"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 pt-4">
              <ReviewForm productId={null} locale={locale} heading={null} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
