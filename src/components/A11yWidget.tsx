'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslations, useLocale } from 'next-intl'
import {
  Accessibility,
  Moon,
  Sun,
  Palette,
  Leaf,
  Pause,
  Link,
  Underline,
  BookOpen,
  AlignJustify,
  Type,
  Bold,
  Crosshair,
  MousePointer2,
  ImageOff,
  PauseCircle,
  AlignLeft,
  RotateCcw,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useUiStore } from '@/stores/uiStore'
import type { A11yPrefs } from '@/stores/uiStore'

type BoolKey = {
  [K in keyof A11yPrefs]: A11yPrefs[K] extends boolean ? K : never
}[keyof A11yPrefs]

interface Option {
  key: BoolKey
  Icon: LucideIcon
}

const OPTIONS: Option[] = [
  { key: 'dark', Icon: Moon },
  { key: 'contrast', Icon: Sun },
  { key: 'grayscale', Icon: Palette },
  { key: 'sepia', Icon: Leaf },
  { key: 'noMotion', Icon: Pause },
  { key: 'links', Icon: Link },
  { key: 'underlineHeadings', Icon: Underline },
  { key: 'readable', Icon: BookOpen },
  { key: 'lineSpacing', Icon: AlignJustify },
  { key: 'letterSpacing', Icon: Type },
  { key: 'bold', Icon: Bold },
  { key: 'focus', Icon: Crosshair },
  { key: 'cursor', Icon: MousePointer2 },
  { key: 'hideImages', Icon: ImageOff },
  { key: 'pauseMedia', Icon: PauseCircle },
  { key: 'readingGuide', Icon: AlignLeft },
]

const FONT_MIN = 100
const FONT_MAX = 150

const DEFAULT_PREFS: A11yPrefs = {
  fontPercent: 100,
  contrast: false,
  dark: false,
  grayscale: false,
  sepia: false,
  links: false,
  readable: false,
  cursor: false,
  noMotion: false,
  lineSpacing: false,
  letterSpacing: false,
  hideImages: false,
  underlineHeadings: false,
  pauseMedia: false,
  bold: false,
  focus: false,
  readingGuide: false,
  systemThemeDismissed: false,
}

export function A11yWidget() {
  const t = useTranslations('a11y')
  const locale = useLocale()
  const { a11y, setA11y } = useUiStore()
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)

  const isRTL = locale === 'he'
  const slideOut = isRTL ? '100%' : '-100%'
  const shouldAnimate = !a11y.noMotion

  // Sync all prefs to <html> data attributes
  useEffect(() => {
    const html = document.documentElement
    html.style.setProperty('--font-scale', String(a11y.fontPercent / 100))
    html.setAttribute('data-contrast', a11y.contrast ? 'true' : '')
    html.setAttribute('data-reduce-motion', a11y.noMotion ? 'true' : '')
    html.setAttribute('data-underline-links', a11y.links ? 'true' : '')
    html.setAttribute('data-dark', a11y.dark ? 'true' : '')
    html.setAttribute('data-grayscale', a11y.grayscale ? 'true' : '')
    html.setAttribute('data-sepia', a11y.sepia ? 'true' : '')
    html.setAttribute('data-readable', a11y.readable ? 'true' : '')
    html.setAttribute('data-line-spacing', a11y.lineSpacing ? 'true' : '')
    html.setAttribute('data-letter-spacing', a11y.letterSpacing ? 'true' : '')
    html.setAttribute('data-hide-images', a11y.hideImages ? 'true' : '')
    html.setAttribute('data-underline-headings', a11y.underlineHeadings ? 'true' : '')
    html.setAttribute('data-bold', a11y.bold ? 'true' : '')
    html.setAttribute('data-focus', a11y.focus ? 'true' : '')
    html.setAttribute('data-cursor', a11y.cursor ? 'true' : '')
  }, [a11y])

  // Follow the OS `prefers-color-scheme` for the custom dark palette until the user
  // explicitly picks a visual mode (dark/contrast/grayscale/sepia) in the widget.
  useEffect(() => {
    if (a11y.systemThemeDismissed) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const applySystemPreference = () => setA11y({ dark: mql.matches })
    applySystemPreference()
    mql.addEventListener('change', applySystemPreference)
    return () => mql.removeEventListener('change', applySystemPreference)
  }, [a11y.systemThemeDismissed, setA11y])

  // Pause all media when enabled
  useEffect(() => {
    if (!a11y.pauseMedia) return
    document.querySelectorAll<HTMLMediaElement>('video, audio').forEach((el) => el.pause())
  }, [a11y.pauseMedia])

  // Reading guide — ref-based to avoid React re-renders on every mousemove
  useEffect(() => {
    if (!a11y.readingGuide) return
    const move = (e: MouseEvent) => {
      if (guideRef.current) guideRef.current.style.top = `${e.clientY}px`
    }
    window.addEventListener('mousemove', move, { passive: true })
    return () => window.removeEventListener('mousemove', move)
  }, [a11y.readingGuide])

  // Escape to close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Move focus into drawer when opened
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => closeRef.current?.focus(), 60)
      return () => clearTimeout(id)
    }
  }, [open])

  const hasActive = a11y.fontPercent > 100 || OPTIONS.some(({ key }) => a11y[key])

  const resetAll = () => setA11y(DEFAULT_PREFS)

  // dark / contrast / grayscale / sepia are mutually exclusive visual modes
  const VISUAL_MODES: BoolKey[] = ['dark', 'contrast', 'grayscale', 'sepia']

  const toggle = (key: BoolKey) => {
    if (VISUAL_MODES.includes(key)) {
      const willEnable = !a11y[key]
      setA11y({
        ...(Object.fromEntries(
          VISUAL_MODES.map((k) => [k, willEnable && k === key])
        ) as Partial<A11yPrefs>),
        // Manually choosing a visual mode opts out of auto-following the OS theme.
        systemThemeDismissed: true,
      })
    } else {
      setA11y({ [key]: !a11y[key] } as Partial<A11yPrefs>)
    }
  }

  return (
    <>
      {/* Reading guide line — follows mouse Y via ref (no React re-renders) */}
      {a11y.readingGuide && (
        <div
          ref={guideRef}
          style={{ top: '50vh', boxShadow: '0 0 10px 4px rgba(139,105,20,0.35)' }}
          className="pointer-events-none fixed inset-x-0 z-[200] h-[2px] bg-primary"
          aria-hidden="true"
        />
      )}

      {/* Floating trigger */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="a11y-trigger"
            initial={shouldAnimate ? { opacity: 0, scale: 0.8 } : false}
            animate={{ opacity: 1, scale: 1 }}
            exit={
              shouldAnimate
                ? { opacity: 0, scale: 0.8, transition: { duration: 0.1 } }
                : { opacity: 0 }
            }
            transition={shouldAnimate ? { duration: 0.15 } : { duration: 0 }}
            onClick={() => setOpen(true)}
            aria-label={t('open')}
            className="fixed bottom-6 start-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-surface shadow-soft transition-colors hover:bg-primary-600 focus-visible:outline-2"
          >
            {hasActive && (
              <span
                className="absolute -end-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-accent"
                aria-hidden="true"
              />
            )}
            <Accessibility className="h-5 w-5" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="a11y-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldAnimate ? { duration: 0.2 } : { duration: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            key="a11y-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={t('widget')}
            initial={{ x: slideOut }}
            animate={{ x: 0 }}
            exit={{ x: slideOut }}
            transition={
              shouldAnimate ? { type: 'tween', duration: 0.25, ease: 'easeOut' } : { duration: 0 }
            }
            className="fixed inset-y-0 start-0 z-[60] flex w-80 flex-col border-e border-border bg-surface shadow-2xl"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-surface">
                  <Accessibility className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-semibold text-text-main">{t('widget')}</span>
              </div>
              <div className="flex items-center gap-1">
                {hasActive && (
                  <button
                    onClick={resetAll}
                    aria-label={t('resetAll')}
                    title={t('resetAll')}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  ref={closeRef}
                  onClick={() => setOpen(false)}
                  aria-label={t('close')}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-secondary hover:text-primary focus-visible:outline-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Font size stepper */}
              <div className="mb-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t('fontSize')}
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={FONT_MIN}
                    max={FONT_MAX}
                    step={1}
                    value={a11y.fontPercent}
                    onChange={(e) => setA11y({ fontPercent: Number(e.target.value) })}
                    aria-label={t('fontSize')}
                    aria-valuetext={`${a11y.fontPercent}%`}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-border accent-primary"
                  />
                  <span className="min-w-[44px] text-center text-sm font-medium tabular-nums text-text-main">
                    {a11y.fontPercent}%
                  </span>
                </div>
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {OPTIONS.map(({ key, Icon }) => {
                  const active = a11y[key]
                  return (
                    <button
                      key={key}
                      role="switch"
                      aria-checked={active}
                      onClick={() => toggle(key)}
                      className={[
                        'flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-xl border-2 px-2 py-3 text-center transition-all duration-200',
                        'focus-visible:outline-2 focus-visible:outline-offset-2',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface text-text-main hover:border-primary/40 hover:bg-secondary',
                      ].join(' ')}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span className="text-xs font-medium leading-tight">{t(key)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
