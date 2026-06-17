'use client'

import { useState, useEffect } from 'react'
import { motion, useDragControls, useMotionValue, AnimatePresence } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useUiStore } from '@/stores/uiStore'

function AccessibilityIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M12 2a2 2 0 110 4 2 2 0 010-4zm0 6c1.1 0 2 .9 2 2v5l2.5 4.5-1.8 1L12 16l-2.7 4.5-1.8-1L10 15v-5c0-1.1.9-2 2-2z" />
    </svg>
  )
}

function GripIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4 text-text-muted"
      aria-hidden="true"
    >
      <path d="M8 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm8-12a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
    </svg>
  )
}

interface ToggleProps {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}

function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="mb-2 flex cursor-pointer items-center justify-between gap-2">
      <span className="text-sm text-text-main">{label}</span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-2',
          checked ? 'bg-primary' : 'bg-border',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </label>
  )
}

export function A11yWidget() {
  const t = useTranslations('a11y')
  const { a11y, setA11y } = useUiStore()
  const [open, setOpen] = useState(false)
  const dragControls = useDragControls()
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const shouldAnimate = !a11y.reduceMotion

  // Sync a11y preferences to <html>
  useEffect(() => {
    const html = document.documentElement
    html.style.setProperty('--font-scale', String(a11y.fontScale))
    html.setAttribute('data-contrast', a11y.highContrast ? 'high' : '')
    html.setAttribute('data-reduce-motion', a11y.reduceMotion ? 'true' : 'false')
    html.setAttribute('data-underline-links', a11y.underlineLinks ? 'true' : 'false')
  }, [a11y])

  const fontScaleDisplay = Math.round(a11y.fontScale * 100)

  return (
    <div className="fixed bottom-6 end-6 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('close') : t('open')}
        aria-expanded={open}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-surface shadow-soft transition-colors hover:bg-primary-600 focus-visible:outline-2"
      >
        <AccessibilityIcon />
      </button>

      {/* Draggable panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="a11y-panel"
            drag
            dragControls={dragControls}
            dragMomentum={false}
            style={{ x, y }}
            initial={
              shouldAnimate ? { opacity: 0, scale: 0.9, y: 10 } : { opacity: 1, scale: 1, y: 0 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={shouldAnimate ? { opacity: 0, scale: 0.9 } : { opacity: 0 }}
            transition={shouldAnimate ? { duration: 0.15, ease: 'easeOut' } : { duration: 0 }}
            className="absolute bottom-14 end-0 w-64 rounded-lg border border-border bg-surface p-4 shadow-soft"
          >
            {/* Drag handle */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="mb-3 flex cursor-grab items-center justify-between active:cursor-grabbing"
            >
              <span className="text-sm font-semibold text-text-main">{t('widget')}</span>
              <GripIcon />
            </div>

            {/* Font scale */}
            <div className="mb-3">
              <span className="mb-1 block text-xs text-text-muted">
                {t('fontSize')} ({fontScaleDisplay}%)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setA11y({
                      fontScale: Math.max(0.8, Math.round((a11y.fontScale - 0.1) * 10) / 10),
                    })
                  }
                  aria-label={t('decrease')}
                  className="flex min-h-[36px] flex-1 items-center justify-center rounded border border-border text-sm font-medium text-text-main transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2"
                >
                  A-
                </button>
                <button
                  onClick={() => setA11y({ fontScale: 1 })}
                  aria-label={t('reset')}
                  className="flex min-h-[36px] flex-1 items-center justify-center rounded border border-border text-sm font-medium text-text-main transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2"
                >
                  {t('reset')}
                </button>
                <button
                  onClick={() =>
                    setA11y({
                      fontScale: Math.min(1.5, Math.round((a11y.fontScale + 0.1) * 10) / 10),
                    })
                  }
                  aria-label={t('increase')}
                  className="flex min-h-[36px] flex-1 items-center justify-center rounded border border-border text-sm font-medium text-text-main transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2"
                >
                  A+
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Toggle
                label={t('highContrast')}
                checked={a11y.highContrast}
                onChange={(v) => setA11y({ highContrast: v })}
              />
              <Toggle
                label={t('reduceMotion')}
                checked={a11y.reduceMotion}
                onChange={(v) => setA11y({ reduceMotion: v })}
              />
              <Toggle
                label={t('underlineLinks')}
                checked={a11y.underlineLinks}
                onChange={(v) => setA11y({ underlineLinks: v })}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
