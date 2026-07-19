'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeftRight, X } from 'lucide-react'
import { Link, usePathname } from '@/i18n/navigation'
import { useCompareStore } from '@/stores/compareStore'
import { useUiStore } from '@/stores/uiStore'

export function CompareBar() {
  const t = useTranslations('compare')
  const ids = useCompareStore((s) => s.ids)
  const clear = useCompareStore((s) => s.clear)
  const { a11y } = useUiStore()
  const shouldAnimate = !a11y.noMotion
  const pathname = usePathname()

  // Session-persisted store — render only after mount so SSR HTML matches
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const visible = mounted && ids.length > 0 && pathname !== '/compare'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4 md:bottom-6"
          initial={shouldAnimate ? { y: 80, opacity: 0 } : false}
          animate={{ y: 0, opacity: 1 }}
          exit={shouldAnimate ? { y: 80, opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-border bg-surface p-2 ps-4 shadow-lg">
            <span className="whitespace-nowrap text-sm font-medium text-text-main">
              {t('bar.count', { count: ids.length })}
            </span>
            <Link
              href="/compare"
              className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full bg-primary px-5 text-sm font-semibold text-surface transition-colors duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <ArrowLeftRight size={16} aria-hidden="true" />
              <span>{t('bar.cta')}</span>
            </Link>
            <button
              type="button"
              onClick={clear}
              aria-label={t('bar.clear')}
              className="flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors duration-150 hover:bg-secondary hover:text-text-main cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
