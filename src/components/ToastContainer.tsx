'use client'

import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'

const borderColorMap = {
  success: 'border-s-4 border-s-green-500',
  error: 'border-s-4 border-s-red-500',
  info: 'border-s-4 border-s-primary',
} as const

export function ToastContainer() {
  const { toasts, removeToast, a11y } = useUiStore()
  const shouldAnimate = !a11y.reduceMotion

  if (toasts.length === 0) return null

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed end-4 top-4 z-[9999] flex flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={shouldAnimate ? { opacity: 0, x: 40, scale: 0.95 } : { opacity: 1 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={shouldAnimate ? { opacity: 0, x: 40, scale: 0.95 } : { opacity: 0 }}
            transition={shouldAnimate ? { duration: 0.2, ease: 'easeOut' } : { duration: 0 }}
            className={[
              'flex min-w-[240px] max-w-sm items-start justify-between gap-3 rounded bg-surface px-4 py-3 text-sm shadow-soft',
              borderColorMap[toast.type],
            ].join(' ')}
            role="alert"
          >
            <span className="text-text-main">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
              className="mt-0.5 flex-shrink-0 text-text-muted transition-colors hover:text-text-main focus-visible:outline-2"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
